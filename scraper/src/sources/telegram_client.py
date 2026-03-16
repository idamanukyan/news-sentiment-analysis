"""Telegram channel monitoring client using Telethon."""
import asyncio
import base64
import json
import os
from datetime import datetime, timezone, timedelta
from hashlib import sha256
from pathlib import Path
from typing import List, Optional, Dict, Any

import structlog
from telethon import TelegramClient
from telethon.tl.types import Channel, Message
from telethon.errors import (
    ChannelPrivateError,
    UsernameNotOccupiedError,
    UsernameInvalidError,
    FloodWaitError,
)

from ..models import Article, Source
from ..config import get_settings
from ..database import get_db

logger = structlog.get_logger()

# Path to channels config (fallback)
CHANNELS_CONFIG_PATH = Path(__file__).parent.parent / "config" / "telegram_channels.json"

# Session file location
SESSION_PATH = Path(__file__).parent.parent.parent / "telegram_session"


def _ensure_session_from_env():
    """Load Telegram session from TELEGRAM_SESSION_BASE64 env var if present."""
    session_b64 = os.environ.get('TELEGRAM_SESSION_BASE64')
    if session_b64:
        try:
            SESSION_PATH.mkdir(parents=True, exist_ok=True)
            session_file = SESSION_PATH / "aiim_telegram.session"
            if not session_file.exists():
                session_data = base64.b64decode(session_b64)
                session_file.write_bytes(session_data)
                structlog.get_logger().info("telegram_session_loaded_from_env")
        except Exception as e:
            structlog.get_logger().error("telegram_session_env_error", error=str(e))


class TelegramMonitor:
    """Monitor Telegram channels for messages."""

    def __init__(
        self,
        api_id: Optional[str] = None,
        api_hash: Optional[str] = None,
        bot_token: Optional[str] = None,
        session_name: str = "aiim_telegram"
    ):
        # Load session from env var if available (for cloud deployment)
        _ensure_session_from_env()

        settings = get_settings()
        self.api_id = api_id or settings.telegram_api_id
        self.api_hash = api_hash or settings.telegram_api_hash
        self.bot_token = bot_token or getattr(settings, 'telegram_bot_token', None) or os.environ.get('TELEGRAM_BOT_TOKEN')
        # Use session path for persistent auth
        self.session_path = str(SESSION_PATH / session_name)
        self.client: Optional[TelegramClient] = None
        self.channels_config = self._load_channels_config()
        self.accessible_channels = []
        self.failed_channels = []
        self.is_bot = False

    def _load_channels_config(self) -> Dict[str, Any]:
        """Load channels configuration from JSON file."""
        try:
            with open(CHANNELS_CONFIG_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning("telegram_channels_config_not_found", path=str(CHANNELS_CONFIG_PATH))
            return {"channels": [], "settings": {}}

    def _get_channels_from_database(self) -> List[Dict[str, Any]]:
        """Load active Telegram channels from database."""
        channels = []
        try:
            with get_db() as db:
                sources = db.query(Source).filter(
                    Source.active == True,
                    Source.type == "TELEGRAM"
                ).all()

                for source in sources:
                    # Extract username from URL (https://t.me/username -> username)
                    url = source.url or ""
                    username = url.replace("https://t.me/", "").replace("@", "").strip("/")

                    if username:
                        channels.append({
                            "source_id": source.id,
                            "username": username,
                            "name": source.name,
                            "language": source.language or "ARMENIAN",
                            "category": "news",
                            "priority": "high",
                        })

            logger.info("telegram_channels_from_db", count=len(channels))
        except Exception as e:
            logger.error("telegram_db_channels_error", error=str(e))

        return channels

    async def connect(self) -> bool:
        """Connect to Telegram API using user session (preferred) or bot token."""
        if not self.api_id or not self.api_hash:
            logger.warning("telegram_credentials_missing")
            return False

        try:
            # Ensure session directory exists
            SESSION_PATH.mkdir(parents=True, exist_ok=True)

            # Try user session first (can read any public channel)
            self.client = TelegramClient(
                self.session_path,
                int(self.api_id),
                self.api_hash
            )

            await self.client.connect()

            if await self.client.is_user_authorized():
                logger.info("telegram_connected_as_user")
                return True

            # Fall back to bot token if user session not available
            if self.bot_token:
                await self.client.disconnect()
                bot_session = str(SESSION_PATH / "aiim_bot")
                self.client = TelegramClient(
                    bot_session,
                    int(self.api_id),
                    self.api_hash
                )
                await self.client.connect()
                if not await self.client.is_user_authorized():
                    logger.info("telegram_bot_auth_starting")
                    await self.client.start(bot_token=self.bot_token)
                self.is_bot = True
                logger.info("telegram_connected_as_bot")
                return True

            logger.warning("telegram_not_authorized",
                         message="Run telegram_auth.py or set TELEGRAM_BOT_TOKEN")
            return False
        except Exception as e:
            logger.error("telegram_connection_failed", error=str(e))
            return False

    async def disconnect(self):
        """Disconnect from Telegram."""
        if self.client:
            await self.client.disconnect()
            logger.info("telegram_disconnected")

    async def fetch_channel_messages(
        self,
        channel_username: str,
        source_id: Optional[int] = None,
        limit: int = 100,
        min_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch recent messages from a Telegram channel.

        Args:
            channel_username: Channel username (without @)
            source_id: Optional source ID from database
            limit: Maximum number of messages to fetch
            min_date: Only fetch messages after this date

        Returns:
            List of message dictionaries
        """
        if not self.client:
            logger.error("telegram_not_connected")
            return []

        if min_date is None:
            min_date = datetime.now(timezone.utc) - timedelta(days=7)

        messages = []
        clean_username = channel_username.replace("@", "").strip()

        try:
            entity = await self.client.get_entity(clean_username)

            if not isinstance(entity, Channel):
                logger.warning("telegram_not_a_channel", username=clean_username)
                self.failed_channels.append({"username": clean_username, "reason": "not_a_channel"})
                return []

            self.accessible_channels.append({
                "username": clean_username,
                "title": entity.title,
                "participants": getattr(entity, 'participants_count', 0)
            })

            # Note: offset_date=None defaults to most recent messages first
            # We explicitly pass None to use Telethon's default behavior
            async for message in self.client.iter_messages(
                entity,
                limit=limit,
                offset_date=None  # Start from most recent, iterate backward
            ):
                if message.date < min_date:
                    break

                if not message.text:
                    continue

                messages.append({
                    "id": message.id,
                    "source_id": source_id,
                    "channel_id": entity.id,
                    "channel_username": clean_username,
                    "channel_title": entity.title,
                    "text": message.text,
                    "date": message.date,
                    "views": message.views or 0,
                    "forwards": message.forwards or 0,
                    "reply_to": message.reply_to_msg_id if message.reply_to else None,
                    "media_type": type(message.media).__name__ if message.media else None,
                })

            logger.info(
                "telegram_fetch_complete",
                channel=clean_username,
                messages_count=len(messages)
            )

        except UsernameNotOccupiedError:
            logger.warning("telegram_channel_not_found", username=clean_username)
            self.failed_channels.append({"username": clean_username, "reason": "not_found"})
        except UsernameInvalidError:
            logger.warning("telegram_invalid_username", username=clean_username)
            self.failed_channels.append({"username": clean_username, "reason": "invalid_username"})
        except ChannelPrivateError:
            logger.warning("telegram_channel_private", username=clean_username)
            self.failed_channels.append({"username": clean_username, "reason": "private"})
        except FloodWaitError as e:
            logger.warning("telegram_flood_wait", username=clean_username, seconds=e.seconds)
            self.failed_channels.append({"username": clean_username, "reason": f"flood_wait_{e.seconds}s"})
        except Exception as e:
            logger.error(
                "telegram_fetch_error",
                channel=clean_username,
                error=str(e)
            )
            self.failed_channels.append({"username": clean_username, "reason": str(e)[:50]})

        return messages

    async def fetch_all_channels(
        self,
        limit_per_channel: int = 50,
        min_date: Optional[datetime] = None,
        use_database: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Fetch messages from all configured channels.

        Args:
            limit_per_channel: Max messages per channel
            min_date: Only fetch messages after this date
            use_database: If True, read channels from database; else use JSON config

        Returns:
            List of all messages from all channels
        """
        all_messages = []
        self.accessible_channels = []
        self.failed_channels = []

        # Get channels from database or config
        if use_database:
            channels = self._get_channels_from_database()
        else:
            channels = self.channels_config.get("channels", [])

        logger.info("telegram_fetching_channels", count=len(channels))

        for channel_config in channels:
            username = channel_config.get("username")
            if not username:
                continue

            source_id = channel_config.get("source_id")

            messages = await self.fetch_channel_messages(
                username,
                source_id=source_id,
                limit=limit_per_channel,
                min_date=min_date
            )

            # Add channel metadata
            for msg in messages:
                msg["category"] = channel_config.get("category", "news")
                msg["language"] = channel_config.get("language", "hy")
                msg["priority"] = channel_config.get("priority", "medium")

            all_messages.extend(messages)

            # Small delay between channels to avoid rate limiting
            await asyncio.sleep(1)

        logger.info(
            "telegram_all_channels_complete",
            channels_attempted=len(channels),
            channels_accessible=len(self.accessible_channels),
            channels_failed=len(self.failed_channels),
            total_messages=len(all_messages)
        )

        # Log failed channels for debugging
        if self.failed_channels:
            logger.warning(
                "telegram_failed_channels",
                failed=self.failed_channels
            )

        return all_messages


def convert_telegram_to_article(
    telegram_msg: Dict[str, Any],
    topic_id: Optional[int] = None
) -> Article:
    """
    Convert a Telegram message to our Article model.

    Args:
        telegram_msg: Telegram message dictionary
        topic_id: Optional topic ID to associate

    Returns:
        Article model instance
    """
    text = telegram_msg.get("text", "")

    # Extract title from first line or truncate
    lines = text.split('\n')
    title = lines[0][:200] if lines else "Telegram Message"

    # Content hash for deduplication
    content_hash = sha256(text.encode()).hexdigest() if text else None

    # Build external ID
    external_id = f"tg_{telegram_msg.get('channel_id')}_{telegram_msg.get('id')}"

    # Build URL
    channel_username = telegram_msg.get("channel_username", "")
    msg_id = telegram_msg.get("id", "")
    url = f"https://t.me/{channel_username}/{msg_id}" if channel_username and msg_id else None

    # Get source_id from message if available
    source_id = telegram_msg.get("source_id")

    # Map language code
    lang = telegram_msg.get("language", "hy")
    if lang in ["hy", "ARMENIAN"]:
        lang = "ARMENIAN"
    elif lang in ["ru", "RUSSIAN"]:
        lang = "RUSSIAN"
    elif lang in ["en", "ENGLISH"]:
        lang = "ENGLISH"

    # Metadata
    metadata = {
        "source_id": source_id,
        "channel_title": telegram_msg.get("channel_title"),
        "channel_username": channel_username,
        "views": telegram_msg.get("views", 0),
        "forwards": telegram_msg.get("forwards", 0),
        "category": telegram_msg.get("category"),
        "media_type": telegram_msg.get("media_type"),
        "topic_id": topic_id,
    }

    return Article(
        source_id=source_id,
        topic_id=topic_id,
        external_id=external_id,
        title=title,
        content=text,
        url=url,
        author=telegram_msg.get("channel_title"),
        published_at=telegram_msg.get("date"),
        content_hash=content_hash,
        extra_data=metadata,
    )


async def fetch_telegram_messages(limit_per_channel: int = 200):
    """
    Main function to fetch all Telegram messages and save to database.

    Args:
        limit_per_channel: Maximum messages to fetch per channel

    Returns:
        Dictionary with results summary
    """
    monitor = TelegramMonitor()

    if not await monitor.connect():
        logger.error("telegram_connect_failed")
        return {"success": False, "error": "connection_failed", "saved": 0}

    try:
        # Fetch messages from last 7 days
        min_date = datetime.now(timezone.utc) - timedelta(days=7)
        messages = await monitor.fetch_all_channels(
            limit_per_channel=limit_per_channel,
            min_date=min_date,
            use_database=True
        )

        if not messages:
            logger.info("telegram_no_messages")
            return {
                "success": True,
                "saved": 0,
                "total": 0,
                "accessible_channels": monitor.accessible_channels,
                "failed_channels": monitor.failed_channels,
            }

        # Convert to Article models
        articles = [convert_telegram_to_article(msg) for msg in messages]

        # Save to database
        saved_count = 0
        with get_db() as db:
            for article in articles:
                # Check for duplicates
                existing = db.query(Article).filter(
                    Article.external_id == article.external_id
                ).first()

                if not existing:
                    # Set source_id from message metadata if available
                    if article.extra_data and article.extra_data.get("source_id"):
                        article.source_id = article.extra_data.get("source_id")
                    db.add(article)
                    saved_count += 1

            # Update last_fetched for successful sources
            for channel in monitor.accessible_channels:
                username = channel.get("username")
                # Find source by URL pattern
                source = db.query(Source).filter(
                    Source.type == "TELEGRAM",
                    Source.url.contains(username)
                ).first()
                if source:
                    source.last_fetched = datetime.now(timezone.utc)
                    source.last_success = datetime.now(timezone.utc)

        logger.info("telegram_save_complete", saved=saved_count, total=len(articles))

        return {
            "success": True,
            "saved": saved_count,
            "total": len(messages),
            "accessible_channels": monitor.accessible_channels,
            "failed_channels": monitor.failed_channels,
            "date_range": {
                "oldest": min(m["date"] for m in messages).isoformat() if messages else None,
                "newest": max(m["date"] for m in messages).isoformat() if messages else None,
            }
        }

    finally:
        await monitor.disconnect()


# Synchronous wrapper for use in scheduler
def fetch_telegram_sync():
    """Synchronous wrapper for fetch_telegram_messages."""
    return asyncio.run(fetch_telegram_messages())


def fetch_all_telegram_sources():
    """
    Main entry point for scheduler - fetches from all Telegram sources.

    Returns:
        Number of saved messages
    """
    result = fetch_telegram_sync()
    if isinstance(result, dict):
        return result.get("saved", 0)
    return result

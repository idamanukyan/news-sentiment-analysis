#!/usr/bin/env python3
"""
AIIM Telegram Authentication Script

Run this locally to authenticate with Telegram.
The session file will be used by the scraper.

Usage:
    pip install telethon
    python telegram_auth.py

After authentication, either:
1. Copy the session file to scraper/telegram_session/
2. Or mount it as a Docker volume
"""
import asyncio
import os
from pathlib import Path
from telethon import TelegramClient
from telethon.errors import (
    ChannelPrivateError,
    UsernameNotOccupiedError,
    UsernameInvalidError,
)

# Load from environment or use defaults
API_ID = os.environ.get('TELEGRAM_API_ID', '35122309')
API_HASH = os.environ.get('TELEGRAM_API_HASH', 'a16a1da2bb62d2a62cd5da4f2fcf9ee2')

# Session path - matches what the scraper expects
SESSION_DIR = Path(__file__).parent / 'scraper' / 'telegram_session'
SESSION_NAME = 'aiim_telegram'

# Test channels - real Armenian news channels
TEST_CHANNELS = [
    'SputnikArmenia',      # Sputnik Armenia - should exist
    'pastinfo',            # Pastinfo - popular news
    'armtimes',            # ArmTimes
    'civilnetam',          # CivilNet
    'ArmenianUnifiedInfoCenter',  # Armenian Unified Infocenter
]


async def main():
    print("=" * 60)
    print("AIIM Telegram Authentication")
    print("=" * 60)
    print()

    # Ensure session directory exists
    SESSION_DIR.mkdir(parents=True, exist_ok=True)
    session_path = str(SESSION_DIR / SESSION_NAME)

    print(f"API ID: {API_ID}")
    print(f"Session will be saved to: {session_path}.session")
    print()

    client = TelegramClient(session_path, int(API_ID), API_HASH)

    print("Starting authentication...")
    print("You will be asked for your phone number and a code sent to Telegram.")
    print()

    await client.start()

    me = await client.get_me()
    print()
    print(f"Successfully authenticated as: {me.first_name} (@{me.username})")
    print(f"Session saved to: {session_path}.session")

    # Test fetching channels
    print()
    print("=" * 60)
    print("Testing Armenian news channel access...")
    print("=" * 60)
    print()

    accessible = []
    failed = []

    for channel in TEST_CHANNELS:
        try:
            entity = await client.get_entity(channel)
            accessible.append({
                'username': channel,
                'title': entity.title,
                'participants': getattr(entity, 'participants_count', 'N/A')
            })
            print(f"  [OK] @{channel}: {entity.title} ({getattr(entity, 'participants_count', 'N/A')} members)")
        except UsernameNotOccupiedError:
            failed.append({'username': channel, 'reason': 'not_found'})
            print(f"  [FAIL] @{channel}: Username not found")
        except UsernameInvalidError:
            failed.append({'username': channel, 'reason': 'invalid'})
            print(f"  [FAIL] @{channel}: Invalid username")
        except ChannelPrivateError:
            failed.append({'username': channel, 'reason': 'private'})
            print(f"  [FAIL] @{channel}: Channel is private")
        except Exception as e:
            failed.append({'username': channel, 'reason': str(e)[:30]})
            print(f"  [FAIL] @{channel}: {type(e).__name__}: {str(e)[:30]}")

        await asyncio.sleep(0.5)  # Rate limiting

    await client.disconnect()

    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Accessible channels: {len(accessible)}")
    print(f"Failed channels: {len(failed)}")
    print()

    if accessible:
        print("Working channels:")
        for ch in accessible:
            print(f"  - @{ch['username']}: {ch['title']}")

    if failed:
        print()
        print("Failed channels (may need different usernames):")
        for ch in failed:
            print(f"  - @{ch['username']}: {ch['reason']}")

    print()
    print("=" * 60)
    print("Next steps:")
    print("=" * 60)
    print("1. Rebuild the scraper: docker compose build scraper")
    print("2. Restart: docker compose up -d scraper")
    print("3. The Telegram job will run automatically every 30 minutes")
    print()


if __name__ == '__main__':
    asyncio.run(main())

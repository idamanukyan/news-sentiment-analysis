import feedparser
import hashlib
import structlog
from datetime import datetime, timezone
from typing import List, Optional
from time import mktime

from ..models import Source, Article
from ..database import get_db

logger = structlog.get_logger()


def parse_published_date(entry) -> Optional[datetime]:
    """Parse various date formats from RSS feeds."""
    if hasattr(entry, 'published_parsed') and entry.published_parsed:
        return datetime.fromtimestamp(mktime(entry.published_parsed), tz=timezone.utc)
    if hasattr(entry, 'updated_parsed') and entry.updated_parsed:
        return datetime.fromtimestamp(mktime(entry.updated_parsed), tz=timezone.utc)
    return None


def compute_hash(content: str) -> str:
    """Compute SHA-256 hash of content."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def fetch_rss_source_by_data(source_id: int, source_name: str, source_url: str) -> List[Article]:
    """Fetch articles from an RSS feed source using extracted data."""
    logger.info("fetching_rss", source_name=source_name, url=source_url)

    try:
        feed = feedparser.parse(source_url)

        if feed.bozo and feed.bozo_exception:
            logger.warning("rss_parse_warning", source=source_name, error=str(feed.bozo_exception))

        articles = []
        for entry in feed.entries[:50]:  # Limit to 50 entries
            # Extract content
            content = ""
            if hasattr(entry, 'content') and entry.content:
                content = entry.content[0].get('value', '')
            elif hasattr(entry, 'summary'):
                content = entry.summary
            elif hasattr(entry, 'description'):
                content = entry.description

            # Create article
            article = Article(
                source_id=source_id,
                external_id=entry.get('id') or entry.get('link'),
                title=entry.get('title', 'Untitled'),
                content=content,
                url=entry.get('link'),
                author=entry.get('author'),
                published_at=parse_published_date(entry),
                content_hash=compute_hash(content) if content else None,
                extra_data={
                    'tags': [tag.term for tag in getattr(entry, 'tags', [])] if hasattr(entry, 'tags') else []
                }
            )
            articles.append(article)

        logger.info("rss_fetch_complete", source=source_name, articles_count=len(articles))
        return articles

    except Exception as e:
        logger.error("rss_fetch_error", source=source_name, error=str(e))
        raise


def save_new_articles_by_id(articles: List[Article], source_id: int, source_name: str) -> int:
    """Save new articles to database, skipping duplicates."""
    saved_count = 0

    with get_db() as db:
        for article in articles:
            # Check if article already exists
            existing = db.query(Article).filter(
                Article.source_id == source_id,
                Article.external_id == article.external_id
            ).first()

            if not existing:
                db.add(article)
                saved_count += 1

        # Update source last_fetched
        source = db.query(Source).filter(Source.id == source_id).first()
        if source:
            source.last_fetched = datetime.now(timezone.utc)
            source.last_success = datetime.now(timezone.utc)

    logger.info("articles_saved", source=source_name, saved=saved_count, total=len(articles))
    return saved_count


def fetch_all_rss_sources():
    """Fetch articles from all active RSS sources."""
    with get_db() as db:
        sources = db.query(Source).filter(
            Source.active == True,
            Source.type == "RSS"
        ).all()

        # Extract source data while session is open
        source_data = [(s.id, s.name, s.url) for s in sources]

    logger.info("starting_rss_fetch", source_count=len(source_data))

    total_saved = 0
    for source_id, source_name, source_url in source_data:
        try:
            articles = fetch_rss_source_by_data(source_id, source_name, source_url)
            saved = save_new_articles_by_id(articles, source_id, source_name)
            total_saved += saved
        except Exception as e:
            logger.error("source_fetch_failed", source=source_name, error=str(e))

    logger.info("rss_fetch_complete", total_saved=total_saved)
    return total_saved

import hashlib
import structlog
from datetime import datetime, timezone
from typing import List, Optional
from bs4 import BeautifulSoup
import httpx

from ..models import Source, Article
from ..database import get_db

logger = structlog.get_logger()


def compute_hash(content: str) -> str:
    """Compute SHA-256 hash of content."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


async def fetch_page(url: str) -> Optional[str]:
    """Fetch HTML content from URL."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=30.0, follow_redirects=True)
            response.raise_for_status()
            return response.text
        except Exception as e:
            logger.error("page_fetch_error", url=url, error=str(e))
            return None


def extract_articles_from_html(html: str, source: Source) -> List[dict]:
    """Extract article data from HTML based on source config."""
    config = source.config or {}
    selector = config.get('selector', 'article')

    soup = BeautifulSoup(html, 'lxml')
    articles = []

    for element in soup.select(selector)[:50]:
        # Try to find title
        title_elem = element.select_one('h1, h2, h3, .title, [class*="title"]')
        title = title_elem.get_text(strip=True) if title_elem else None

        if not title:
            continue

        # Try to find link
        link_elem = element.select_one('a[href]')
        url = link_elem.get('href') if link_elem else None
        if url and not url.startswith('http'):
            url = source.url.rstrip('/') + '/' + url.lstrip('/')

        # Try to find content/summary
        content_elem = element.select_one('p, .summary, .excerpt, [class*="excerpt"]')
        content = content_elem.get_text(strip=True) if content_elem else ""

        # Try to find date
        date_elem = element.select_one('time, .date, [class*="date"]')
        date_str = date_elem.get('datetime') or date_elem.get_text(strip=True) if date_elem else None

        articles.append({
            'title': title,
            'url': url,
            'content': content,
            'external_id': url,
            'published_at': None,  # Would need date parsing
        })

    return articles


async def scrape_web_source(source: Source) -> List[Article]:
    """Scrape articles from a web source."""
    logger.info("scraping_web_source", source_name=source.name, url=source.url)

    html = await fetch_page(source.url)
    if not html:
        return []

    article_data = extract_articles_from_html(html, source)

    articles = []
    for data in article_data:
        article = Article(
            source_id=source.id,
            external_id=data['external_id'],
            title=data['title'],
            content=data['content'],
            url=data['url'],
            published_at=data.get('published_at'),
            content_hash=compute_hash(data['content']) if data['content'] else None,
        )
        articles.append(article)

    logger.info("web_scrape_complete", source=source.name, articles_count=len(articles))
    return articles


def save_new_articles(articles: List[Article], source: Source) -> int:
    """Save new articles to database, skipping duplicates."""
    saved_count = 0

    with get_db() as db:
        for article in articles:
            # Check if article already exists
            existing = db.query(Article).filter(
                Article.source_id == source.id,
                Article.external_id == article.external_id
            ).first()

            if not existing:
                db.add(article)
                saved_count += 1

        # Update source timestamps
        source.last_fetched = datetime.now(timezone.utc)
        source.last_success = datetime.now(timezone.utc)
        db.merge(source)

    logger.info("articles_saved", source=source.name, saved=saved_count)
    return saved_count

"""NewsAPI.org client for global news search."""
import httpx
import structlog
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from ..models import Article
from ..config import get_settings

logger = structlog.get_logger()

NEWSAPI_BASE_URL = "https://newsapi.org/v2"


class NewsAPIClient:
    """Client for NewsAPI.org global news search."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or get_settings().newsapi_key
        self.client = httpx.Client(timeout=30.0)

    def search_news(
        self,
        keywords: List[str],
        language: str = "en",
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        page_size: int = 50,
        sort_by: str = "publishedAt"
    ) -> List[Dict[str, Any]]:
        """
        Search for news articles matching keywords.

        Args:
            keywords: List of keywords/phrases to search for
            language: Language code (en, ru, etc.)
            from_date: Start date for search
            to_date: End date for search
            page_size: Number of results (max 100)
            sort_by: Sort order (publishedAt, relevancy, popularity)

        Returns:
            List of article dictionaries from NewsAPI
        """
        if not self.api_key:
            logger.warning("newsapi_no_key", message="NewsAPI key not configured")
            return []

        # Build query from keywords
        query = " OR ".join(f'"{kw}"' if " " in kw else kw for kw in keywords)

        # Default date range: last 7 days (NewsAPI free tier limit)
        if not from_date:
            from_date = datetime.now(timezone.utc) - timedelta(days=7)
        if not to_date:
            to_date = datetime.now(timezone.utc)

        params = {
            "q": query,
            "language": language,
            "from": from_date.strftime("%Y-%m-%dT%H:%M:%S"),
            "to": to_date.strftime("%Y-%m-%dT%H:%M:%S"),
            "pageSize": min(page_size, 100),
            "sortBy": sort_by,
            "apiKey": self.api_key,
        }

        try:
            logger.info("newsapi_search", query=query, language=language)
            response = self.client.get(f"{NEWSAPI_BASE_URL}/everything", params=params)
            response.raise_for_status()

            data = response.json()

            if data.get("status") != "ok":
                logger.error("newsapi_error", error=data.get("message"))
                return []

            articles = data.get("articles", [])
            logger.info("newsapi_results", count=len(articles), total=data.get("totalResults", 0))

            return articles

        except httpx.HTTPStatusError as e:
            logger.error("newsapi_http_error", status=e.response.status_code, error=str(e))
            return []
        except Exception as e:
            logger.error("newsapi_error", error=str(e))
            return []

    def get_top_headlines(
        self,
        keywords: Optional[List[str]] = None,
        country: Optional[str] = None,
        category: Optional[str] = None,
        page_size: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get top headlines, optionally filtered by keywords.

        Args:
            keywords: Optional keywords to filter headlines
            country: Country code (us, gb, etc.)
            category: Category (business, technology, etc.)
            page_size: Number of results

        Returns:
            List of headline articles
        """
        if not self.api_key:
            logger.warning("newsapi_no_key", message="NewsAPI key not configured")
            return []

        params = {
            "pageSize": min(page_size, 100),
            "apiKey": self.api_key,
        }

        if keywords:
            params["q"] = " OR ".join(keywords)
        if country:
            params["country"] = country
        if category:
            params["category"] = category

        try:
            response = self.client.get(f"{NEWSAPI_BASE_URL}/top-headlines", params=params)
            response.raise_for_status()

            data = response.json()

            if data.get("status") != "ok":
                logger.error("newsapi_error", error=data.get("message"))
                return []

            return data.get("articles", [])

        except Exception as e:
            logger.error("newsapi_headlines_error", error=str(e))
            return []

    def close(self):
        """Close the HTTP client."""
        self.client.close()


def convert_newsapi_to_article(
    newsapi_article: Dict[str, Any],
    topic_id: Optional[int] = None
) -> Article:
    """
    Convert a NewsAPI article to our Article model.

    Args:
        newsapi_article: Article dict from NewsAPI
        topic_id: Optional topic ID this article belongs to

    Returns:
        Article model instance
    """
    from hashlib import sha256

    # Parse published date
    published_at = None
    if newsapi_article.get("publishedAt"):
        try:
            published_at = datetime.fromisoformat(
                newsapi_article["publishedAt"].replace("Z", "+00:00")
            )
        except ValueError:
            pass

    # Compute content hash
    content = newsapi_article.get("content") or newsapi_article.get("description") or ""
    content_hash = sha256(content.encode()).hexdigest() if content else None

    # Build metadata
    metadata = {
        "source_name": newsapi_article.get("source", {}).get("name"),
        "source_id": newsapi_article.get("source", {}).get("id"),
        "url_to_image": newsapi_article.get("urlToImage"),
        "topic_id": topic_id,
        "global_search": True,
    }

    return Article(
        source_id=None,  # No local source for global articles
        external_id=newsapi_article.get("url"),  # Use URL as external ID
        title=newsapi_article.get("title", "Untitled"),
        content=content,
        url=newsapi_article.get("url"),
        author=newsapi_article.get("author"),
        published_at=published_at,
        content_hash=content_hash,
        extra_data=metadata,
    )


def search_topic_news(
    keywords: List[str],
    topic_id: int,
    language: str = "en",
    api_key: Optional[str] = None
) -> List[Article]:
    """
    Search for news matching topic keywords and return Article instances.

    Args:
        keywords: Topic keywords to search for
        topic_id: ID of the topic
        language: Language to search in
        api_key: Optional NewsAPI key

    Returns:
        List of Article instances
    """
    client = NewsAPIClient(api_key)

    try:
        raw_articles = client.search_news(keywords, language=language)
        articles = [
            convert_newsapi_to_article(article, topic_id)
            for article in raw_articles
        ]
        return articles
    finally:
        client.close()

"""Topic-based global news search service."""
import structlog
from datetime import datetime, timezone
from typing import List, Optional

from ..database import get_db
from ..models import Article
from ..sources.newsapi_client import NewsAPIClient, convert_newsapi_to_article

logger = structlog.get_logger()


class TopicSearchService:
    """Service for searching global news based on user-defined topics."""

    def __init__(self, newsapi_key: Optional[str] = None):
        self.newsapi_client = NewsAPIClient(newsapi_key)

    def search_and_save_topic_articles(
        self,
        topic_id: int,
        keywords: List[str],
        language: str = "en"
    ) -> int:
        """
        Search for articles matching topic keywords and save to database.

        Args:
            topic_id: The topic ID
            keywords: Keywords to search for
            language: Language code

        Returns:
            Number of new articles saved
        """
        logger.info(
            "topic_search_start",
            topic_id=topic_id,
            keywords=keywords,
            language=language
        )

        # Search for articles
        raw_articles = self.newsapi_client.search_news(
            keywords=keywords,
            language=language,
            page_size=50
        )

        if not raw_articles:
            logger.info("topic_search_no_results", topic_id=topic_id)
            return 0

        # Convert to Article models
        articles = [
            convert_newsapi_to_article(article, topic_id)
            for article in raw_articles
        ]

        # Save new articles to database
        saved_count = 0
        with get_db() as db:
            for article in articles:
                # Check if article already exists (by URL/external_id)
                existing = db.query(Article).filter(
                    Article.external_id == article.external_id
                ).first()

                if not existing:
                    db.add(article)
                    saved_count += 1

        logger.info(
            "topic_search_complete",
            topic_id=topic_id,
            found=len(articles),
            saved=saved_count
        )

        return saved_count

    def close(self):
        """Clean up resources."""
        self.newsapi_client.close()


def fetch_all_topics():
    """
    Fetch articles for all topics that have global search enabled.

    Returns:
        Total number of new articles saved
    """
    total_saved = 0

    with get_db() as db:
        # Get all topics with global_search enabled
        # Note: We need to add this field to the Topic model in the backend
        from sqlalchemy import text

        result = db.execute(text("""
            SELECT t.id, t.name, t.keywords, t.language
            FROM topics t
            WHERE t.global_search = true
        """))

        topics = result.fetchall()

    if not topics:
        logger.info("no_global_topics", message="No topics with global search enabled")
        return 0

    service = TopicSearchService()

    try:
        for topic in topics:
            topic_id, name, keywords, language = topic
            logger.info("processing_topic", topic_id=topic_id, name=name)

            try:
                saved = service.search_and_save_topic_articles(
                    topic_id=topic_id,
                    keywords=keywords or [],
                    language=language or "en"
                )
                total_saved += saved
            except Exception as e:
                logger.error(
                    "topic_search_error",
                    topic_id=topic_id,
                    error=str(e)
                )
    finally:
        service.close()

    logger.info("all_topics_complete", total_saved=total_saved)
    return total_saved

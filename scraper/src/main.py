import structlog
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger

from .config import get_settings
from .sources.rss_fetcher import fetch_all_rss_sources
from .sources.web_scraper import fetch_all_web_sources
from .sources.telegram_client import fetch_all_telegram_sources
from .sources.facebook_scraper import fetch_all_facebook_sources
from .sentiment.analyzer import process_unanalyzed_articles, process_untranslated_articles
from .services.topic_search import fetch_all_topics
from .services.llm_narrative_clustering import classify_articles, rebuild_clusters
from .services.coordination_detector import detect_coordination
from .services.credibility_scorer import calculate_source_credibility

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()
settings = get_settings()


def run_fetch_job():
    """Job to fetch articles from all RSS sources."""
    logger.info("starting_fetch_job")
    try:
        fetch_all_rss_sources()
    except Exception as e:
        logger.error("fetch_job_error", error=str(e))


def run_web_scrape_job():
    """Job to scrape articles from all web sources."""
    logger.info("starting_web_scrape_job")
    try:
        fetch_all_web_sources()
    except Exception as e:
        logger.error("web_scrape_job_error", error=str(e))


def run_telegram_job():
    """Job to fetch messages from Telegram channels."""
    logger.info("starting_telegram_job")
    try:
        result = fetch_all_telegram_sources()
        logger.info("telegram_job_complete", saved=result)
    except Exception as e:
        logger.error("telegram_job_error", error=str(e))


def run_facebook_job():
    """Job to fetch posts from Facebook public pages."""
    logger.info("starting_facebook_job")
    try:
        result = fetch_all_facebook_sources()
        logger.info("facebook_job_complete", saved=result)
    except Exception as e:
        logger.error("facebook_job_error", error=str(e))


def run_sentiment_job():
    """
    Job to process new articles with combined analysis.

    The combined analysis does:
    1. Language detection
    2. Translation to English (if not already English)
    3. Sentiment analysis on original text
    4. Keyword extraction in English
    5. Topic classification

    All in a single Claude API call per article.
    """
    logger.info("starting_sentiment_job")
    try:
        processed = process_unanalyzed_articles(limit=20)
        logger.info("sentiment_job_complete", processed=processed)
    except Exception as e:
        logger.error("sentiment_job_error", error=str(e))


def run_backfill_translation_job():
    """
    Job to backfill translations for articles that have sentiment but no translation.

    This is for existing articles processed before the translation feature was added.
    Runs less frequently as it's catching up historical data.
    """
    logger.info("starting_backfill_translation_job")
    try:
        processed = process_untranslated_articles(limit=10)
        logger.info("backfill_translation_job_complete", processed=processed)
    except Exception as e:
        logger.error("backfill_translation_job_error", error=str(e))


def run_topic_search_job():
    """Job to search global news for user-defined topics."""
    logger.info("starting_topic_search_job")
    try:
        fetch_all_topics()
    except Exception as e:
        logger.error("topic_search_job_error", error=str(e))


def run_article_classification_job():
    """Job to classify unclassified articles using LLM (or fallback)."""
    logger.info("starting_article_classification_job")
    try:
        result = classify_articles(limit=100)
        logger.info("article_classification_complete",
                   classified=result.get("classified", 0),
                   by_topic=result.get("by_topic", {}))
    except Exception as e:
        logger.error("article_classification_job_error", error=str(e))


def run_narrative_clustering_job():
    """Job to rebuild narrative clusters from classified articles."""
    logger.info("starting_narrative_clustering_job")
    try:
        result = rebuild_clusters(days=7, min_cluster_size=3)
        logger.info("narrative_clustering_complete",
                   clusters=result.get("clusters", 0),
                   narratives=result.get("narratives", 0))
    except Exception as e:
        logger.error("narrative_clustering_job_error", error=str(e))


def run_coordination_detection_job():
    """Job to detect coordinated publishing patterns across sources."""
    logger.info("starting_coordination_detection_job")
    try:
        events_created = detect_coordination(lookback_hours=48)
        logger.info("coordination_detection_complete", events_created=events_created)
    except Exception as e:
        logger.error("coordination_detection_job_error", error=str(e))


def run_credibility_scoring_job():
    """Job to calculate credibility scores for all sources."""
    logger.info("starting_credibility_scoring_job")
    try:
        sources_updated = calculate_source_credibility()
        logger.info("credibility_scoring_complete", sources_updated=sources_updated)
    except Exception as e:
        logger.error("credibility_scoring_job_error", error=str(e))


def main():
    """Main entry point for the scraper service."""
    # Startup diagnostics - check API key configuration
    has_anthropic_key = bool(settings.anthropic_api_key and len(settings.anthropic_api_key) > 10)
    logger.info(
        "starting_scraper_service",
        interval=settings.scrape_interval_minutes,
        anthropic_key_configured=has_anthropic_key,
        anthropic_key_prefix=settings.anthropic_api_key[:15] + "..." if has_anthropic_key else "NOT SET"
    )

    if not has_anthropic_key:
        logger.warning(
            "anthropic_api_key_missing",
            message="ANTHROPIC_API_KEY environment variable is not set. AI features will not work."
        )

    # Run immediately on startup
    run_fetch_job()
    run_web_scrape_job()
    run_telegram_job()
    run_facebook_job()
    run_topic_search_job()
    run_sentiment_job()
    run_backfill_translation_job()  # Catch up historical articles
    run_article_classification_job()
    run_narrative_clustering_job()
    run_coordination_detection_job()  # Detect coordinated activity
    run_credibility_scoring_job()  # Calculate source credibility scores

    # Schedule periodic jobs
    scheduler = BlockingScheduler()

    scheduler.add_job(
        run_fetch_job,
        IntervalTrigger(minutes=settings.scrape_interval_minutes),
        id="fetch_job",
        name="Fetch articles from RSS sources"
    )

    scheduler.add_job(
        run_web_scrape_job,
        IntervalTrigger(minutes=30),  # Web scraping every 30 minutes
        id="web_scrape_job",
        name="Scrape articles from web sources"
    )

    scheduler.add_job(
        run_telegram_job,
        IntervalTrigger(minutes=30),  # Telegram every 30 minutes
        id="telegram_job",
        name="Fetch Telegram channel messages"
    )

    scheduler.add_job(
        run_facebook_job,
        IntervalTrigger(minutes=30),  # Facebook every 30 minutes
        id="facebook_job",
        name="Fetch Facebook public page posts"
    )

    scheduler.add_job(
        run_topic_search_job,
        IntervalTrigger(minutes=60),  # Hourly for global search
        id="topic_search_job",
        name="Search global news for topics"
    )

    scheduler.add_job(
        run_sentiment_job,
        IntervalTrigger(minutes=5),  # More frequent for new articles
        id="sentiment_job",
        name="Combined analysis (translate + sentiment + classify)"
    )

    scheduler.add_job(
        run_backfill_translation_job,
        IntervalTrigger(minutes=15),  # Less frequent, catching up historical data
        id="backfill_translation_job",
        name="Backfill translations for historical articles"
    )

    scheduler.add_job(
        run_article_classification_job,
        IntervalTrigger(hours=2),  # Every 2 hours for fallback classification
        id="article_classification_job",
        name="Classify articles by topic (fallback)"
    )

    scheduler.add_job(
        run_narrative_clustering_job,
        IntervalTrigger(hours=4),  # Every 4 hours for clustering
        id="narrative_clustering_job",
        name="Rebuild narrative clusters"
    )

    scheduler.add_job(
        run_coordination_detection_job,
        IntervalTrigger(hours=2),  # Every 2 hours for coordination detection
        id="coordination_detection_job",
        name="Detect coordinated publishing patterns"
    )

    scheduler.add_job(
        run_credibility_scoring_job,
        IntervalTrigger(hours=6),  # Every 6 hours for credibility scoring
        id="credibility_scoring_job",
        name="Calculate source credibility scores"
    )

    try:
        logger.info("scheduler_started")
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("scheduler_shutdown")


if __name__ == "__main__":
    main()

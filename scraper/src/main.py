import structlog
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger

from .config import get_settings
from .sources.rss_fetcher import fetch_all_rss_sources
from .sentiment.analyzer import process_unanalyzed_articles
from .services.topic_search import fetch_all_topics

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
    """Job to fetch articles from all sources."""
    logger.info("starting_fetch_job")
    try:
        fetch_all_rss_sources()
    except Exception as e:
        logger.error("fetch_job_error", error=str(e))


def run_sentiment_job():
    """Job to analyze sentiment of new articles."""
    logger.info("starting_sentiment_job")
    try:
        process_unanalyzed_articles(limit=20)
    except Exception as e:
        logger.error("sentiment_job_error", error=str(e))


def run_topic_search_job():
    """Job to search global news for user-defined topics."""
    logger.info("starting_topic_search_job")
    try:
        fetch_all_topics()
    except Exception as e:
        logger.error("topic_search_job_error", error=str(e))


def main():
    """Main entry point for the scraper service."""
    logger.info("starting_scraper_service", interval=settings.scrape_interval_minutes)

    # Run immediately on startup
    run_fetch_job()
    run_topic_search_job()
    run_sentiment_job()

    # Schedule periodic jobs
    scheduler = BlockingScheduler()

    scheduler.add_job(
        run_fetch_job,
        IntervalTrigger(minutes=settings.scrape_interval_minutes),
        id="fetch_job",
        name="Fetch articles from sources"
    )

    scheduler.add_job(
        run_topic_search_job,
        IntervalTrigger(minutes=60),  # Hourly for global search
        id="topic_search_job",
        name="Search global news for topics"
    )

    scheduler.add_job(
        run_sentiment_job,
        IntervalTrigger(minutes=5),  # More frequent for sentiment
        id="sentiment_job",
        name="Analyze article sentiment"
    )

    try:
        logger.info("scheduler_started")
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("scheduler_shutdown")


if __name__ == "__main__":
    main()

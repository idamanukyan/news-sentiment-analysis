"""RSS articles must be tagged with the source's language on ingestion."""
import pytest
from unittest.mock import patch, MagicMock


def _fake_feed():
    entry = {
        "id": "https://www.tagesschau.de/a/1",
        "link": "https://www.tagesschau.de/a/1",
        "title": "EU-Sanktionen",
        "summary": "Ein Artikel über die deutsche Wirtschaft.",
        "author": "ARD",
    }
    feed = MagicMock()
    feed.bozo = 0
    feed.bozo_exception = None
    feed.entries = [entry]
    return feed


def test_rss_article_tagged_with_source_language():
    from src.sources.rss_fetcher import fetch_rss_source_by_data
    with patch("src.sources.rss_fetcher.feedparser.parse", return_value=_fake_feed()):
        articles = fetch_rss_source_by_data(
            5, "Tagesschau (ARD)", "https://www.tagesschau.de/xml/rss2", "GERMAN"
        )
    assert len(articles) == 1
    assert articles[0].language == "de"


def test_rss_article_armenian_source_tagged_hy():
    from src.sources.rss_fetcher import fetch_rss_source_by_data
    with patch("src.sources.rss_fetcher.feedparser.parse", return_value=_fake_feed()):
        articles = fetch_rss_source_by_data(9, "Some AM feed", "https://x.am/rss", "ARMENIAN")
    assert articles[0].language == "hy"

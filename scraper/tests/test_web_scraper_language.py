"""Web-scraped articles must be tagged with the source's language on ingestion."""
import asyncio
from unittest.mock import patch, AsyncMock


class _Source:
    def __init__(self, language):
        self.id = 3
        self.name = "Demo DE site"
        self.url = "https://example.de"
        self.config = {"selector": "article"}
        self.language = language


_HTML = """
<html><body>
  <article><h2>Deutsche Schlagzeile</h2><p>Ein kurzer Absatz.</p>
    <a href="/artikel/1">link</a></article>
</body></html>
"""


def _scrape(source):
    from src.sources.web_scraper import scrape_web_source
    with patch("src.sources.web_scraper.fetch_page", new=AsyncMock(return_value=_HTML)):
        return asyncio.run(scrape_web_source(source))


def test_web_article_tagged_with_source_language():
    articles = _scrape(_Source("GERMAN"))
    assert len(articles) == 1
    assert articles[0].language == "de"


def test_web_article_armenian_source_tagged_hy():
    articles = _scrape(_Source("ARMENIAN"))
    assert articles[0].language == "hy"

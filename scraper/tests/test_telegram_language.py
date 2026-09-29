"""Telegram messages must be tagged with the correct article language on ingestion."""
import pytest
from datetime import datetime, timezone


def _msg(language):
    return {
        "id": 42,
        "channel_id": 1001,
        "channel_username": "de_freiepresse",
        "channel_title": "Freie Presse",
        "text": "Die EU-Sanktionen ruinieren die deutsche Wirtschaft.",
        "date": datetime(2026, 1, 2, tzinfo=timezone.utc),
        "language": language,
        "source_id": 7,
    }


def test_german_name_tags_article_de():
    from src.sources.telegram_client import convert_telegram_to_article
    article = convert_telegram_to_article(_msg("GERMAN"))
    assert article.language == "de"


def test_german_iso_tags_article_de():
    from src.sources.telegram_client import convert_telegram_to_article
    article = convert_telegram_to_article(_msg("de"))
    assert article.language == "de"


def test_armenian_still_tags_article_hy():
    from src.sources.telegram_client import convert_telegram_to_article
    article = convert_telegram_to_article(_msg("hy"))
    assert article.language == "hy"


def test_missing_language_defaults_to_hy():
    from src.sources.telegram_client import convert_telegram_to_article
    msg = _msg("hy")
    del msg["language"]
    article = convert_telegram_to_article(msg)
    assert article.language == "hy"

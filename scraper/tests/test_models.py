"""Tests for database models."""
import pytest
from datetime import datetime, timezone


def test_source_enum_values():
    """Test that source type enum values are correct."""
    from src.models import SourceType
    assert SourceType.RSS.value == "RSS"
    assert SourceType.WEB_SCRAPE.value == "WEB_SCRAPE"
    assert SourceType.TELEGRAM.value == "TELEGRAM"


def test_language_enum_values():
    """Test that language enum values are correct."""
    from src.models import Language
    assert Language.ARMENIAN.value == "ARMENIAN"
    assert Language.RUSSIAN.value == "RUSSIAN"
    assert Language.ENGLISH.value == "ENGLISH"


def test_sentiment_enum_values():
    """Test that sentiment enum values are correct."""
    from src.models import Sentiment
    assert Sentiment.POSITIVE.value == "POSITIVE"
    assert Sentiment.NEGATIVE.value == "NEGATIVE"
    assert Sentiment.NEUTRAL.value == "NEUTRAL"

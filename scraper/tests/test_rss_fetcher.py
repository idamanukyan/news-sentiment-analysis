"""Tests for RSS fetcher."""
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch


def test_compute_hash():
    """Test content hash computation."""
    from src.sources.rss_fetcher import compute_hash

    hash1 = compute_hash("test content")
    hash2 = compute_hash("test content")
    hash3 = compute_hash("different content")

    assert hash1 == hash2
    assert hash1 != hash3
    assert len(hash1) == 64  # SHA-256 produces 64 character hex string


def test_parse_published_date_with_published():
    """Test parsing published date from RSS entry."""
    from src.sources.rss_fetcher import parse_published_date
    from time import struct_time

    mock_entry = MagicMock()
    mock_entry.published_parsed = struct_time((2024, 1, 15, 10, 30, 0, 0, 15, 0))
    mock_entry.updated_parsed = None

    result = parse_published_date(mock_entry)

    assert result is not None
    assert result.year == 2024
    assert result.month == 1
    assert result.day == 15


def test_parse_published_date_none():
    """Test parsing when no date available."""
    from src.sources.rss_fetcher import parse_published_date

    mock_entry = MagicMock()
    mock_entry.published_parsed = None
    mock_entry.updated_parsed = None

    result = parse_published_date(mock_entry)

    assert result is None

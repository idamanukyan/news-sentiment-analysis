"""The sentiment analyzer prompts must be German-aware and use the shared taxonomy."""
import pytest


def test_batch_prompt_allows_german_detection():
    from src.sentiment.prompts import BATCH_ANALYSIS_PROMPT
    assert "hy/ru/en/de" in BATCH_ANALYSIS_PROMPT


def test_single_prompt_allows_german_detection():
    from src.sentiment.prompts import SINGLE_ANALYSIS_PROMPT
    assert "hy/ru/en/de" in SINGLE_ANALYSIS_PROMPT


def test_batch_prompt_lists_german_fimi_topics():
    from src.sentiment.prompts import BATCH_ANALYSIS_PROMPT
    assert "Migration" in BATCH_ANALYSIS_PROMPT
    assert "Ukraine War" in BATCH_ANALYSIS_PROMPT
    assert "Sanctions" in BATCH_ANALYSIS_PROMPT


def test_batch_prompt_topics_come_from_taxonomy():
    from src.sentiment.prompts import BATCH_ANALYSIS_PROMPT
    from src.taxonomy import VALID_TOPICS
    for topic in VALID_TOPICS:
        assert topic in BATCH_ANALYSIS_PROMPT

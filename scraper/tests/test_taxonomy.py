"""The topic taxonomy is a single shared source of truth, incl. German/EU-FIMI themes."""
import pytest


GERMAN_FIMI_TOPICS = {"Migration", "Energy", "Defense", "Ukraine War", "Sanctions"}
CORE_TOPICS = {"Elections", "Media", "Corruption", "Economy", "Security", "Other"}


def test_taxonomy_includes_german_fimi_topics():
    from src.taxonomy import VALID_TOPICS
    assert GERMAN_FIMI_TOPICS.issubset(set(VALID_TOPICS))


def test_taxonomy_retains_core_topics():
    from src.taxonomy import VALID_TOPICS
    assert CORE_TOPICS.issubset(set(VALID_TOPICS))


def test_taxonomy_has_no_duplicates():
    from src.taxonomy import VALID_TOPICS
    assert len(VALID_TOPICS) == len(set(VALID_TOPICS))


def test_other_is_last():
    from src.taxonomy import VALID_TOPICS
    assert VALID_TOPICS[-1] == "Other"


def test_topics_for_prompt_contains_every_topic():
    from src.taxonomy import VALID_TOPICS, topics_for_prompt
    rendered = topics_for_prompt()
    for topic in VALID_TOPICS:
        assert topic in rendered


def test_topics_for_prompt_respects_separator():
    from src.taxonomy import topics_for_prompt
    assert "/" in topics_for_prompt(separator="/")

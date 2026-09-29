"""The clustering classify prompt must be language-neutral and use the taxonomy."""
import pytest


def test_system_prompt_is_language_neutral():
    from src.services.llm_narrative_clustering import CLASSIFY_SYSTEM_PROMPT
    assert "Armenian" not in CLASSIFY_SYSTEM_PROMPT
    assert "news article" in CLASSIFY_SYSTEM_PROMPT.lower()


def test_clustering_uses_shared_taxonomy():
    from src.services.llm_narrative_clustering import VALID_TOPICS
    from src.taxonomy import VALID_TOPICS as SHARED
    assert VALID_TOPICS is SHARED

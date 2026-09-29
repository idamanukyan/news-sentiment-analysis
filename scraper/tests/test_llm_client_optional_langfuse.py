"""Langfuse is optional observability; the LLM client must import without it."""
import pytest


def test_llm_client_imports_without_langfuse():
    import src.llm_client as m
    assert callable(m.create_message)


def test_observe_is_usable_as_decorator():
    from src.llm_client import observe

    @observe(name="unit-test")
    def add(a, b):
        return a + b

    assert add(2, 3) == 5


def test_get_langfuse_returns_none_when_unavailable(monkeypatch):
    import src.llm_client as m
    # With no keys configured / library absent, no client should be created.
    m.get_langfuse.cache_clear()
    monkeypatch.setattr(m.settings, "langfuse_public_key", "", raising=False)
    monkeypatch.setattr(m.settings, "langfuse_secret_key", "", raising=False)
    assert m.get_langfuse() is None

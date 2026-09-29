"""Rule-based fallback classifier must recognise German FIMI topics."""
import pytest


@pytest.fixture
def clusterer():
    from src.services.llm_narrative_clustering import LLMNarrativeClustering
    return LLMNarrativeClustering()


def test_german_migration(clusterer):
    r = clusterer.classify_article_rule_based(
        "Migration und Asyl", "Flüchtlinge und Einwanderung nach Deutschland."
    )
    assert r["topic"] == "Migration"


def test_german_energy(clusterer):
    r = clusterer.classify_article_rule_based(
        "Energiewende", "Strompreise, Gas und Kernkraft in der Energiepolitik."
    )
    assert r["topic"] == "Energy"


def test_german_defense_nato(clusterer):
    r = clusterer.classify_article_rule_based(
        "NATO", "Bundeswehr und Aufrüstung der Verteidigung."
    )
    assert r["topic"] == "Defense"


def test_german_sanctions(clusterer):
    r = clusterer.classify_article_rule_based(
        "Sanktionen", "Embargo als Strafmaßnahmen gegen den Handel."
    )
    assert r["topic"] == "Sanctions"


def test_german_ukraine_war(clusterer):
    r = clusterer.classify_article_rule_based(
        "Ukraine", "Der Krieg: Selenskyj in Kiew."
    )
    assert r["topic"] == "Ukraine War"

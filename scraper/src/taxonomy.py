"""Shared topic taxonomy for article classification and narrative clustering.

Single source of truth for the topics the LLM may assign. Both the sentiment
analyzer prompt and the narrative-clustering prompt render their allowed-topic
list from here so the taxonomy cannot drift between them.

Covers the Armenian corpus and the German / EU-FIMI themes used in the German
reference demo (migration, energy, Ukraine war, NATO/defense, sanctions).
"""
from typing import List

# Order matters only in that "Other" is the catch-all and stays last.
VALID_TOPICS: List[str] = [
    "Elections",
    "Foreign Policy",
    "Economy",
    "Security",
    "Defense",
    "Corruption",
    "Human Rights",
    "Media",
    "Infrastructure",
    "EU Relations",
    "Russia Relations",
    "Armenia-Azerbaijan",
    "Migration",
    "Energy",
    "Ukraine War",
    "Sanctions",
    "Diaspora",
    "Judiciary",
    "Health",
    "Education",
    "Environment",
    "Culture",
    "Sports",
    "Other",
]


def topics_for_prompt(separator: str = ", ") -> str:
    """Render the taxonomy as a delimited string for inclusion in an LLM prompt."""
    return separator.join(VALID_TOPICS)

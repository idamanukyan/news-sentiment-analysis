"""Language normalization for tagging ingested articles.

Sources store their language as either an enum name (``GERMAN``, ``ARMENIAN``,
``RUSSIAN``, ``ENGLISH``) or an ISO 639-1 code (``de``, ``hy``, ``ru``, ``en``).
Articles are tagged with the ISO 639-1 code (see ``Article.language`` /
``Article.detected_language``), so this maps any accepted form to that code.
"""
from typing import Optional

# Maps accepted source-language spellings to ISO 639-1 codes.
_LANGUAGE_TO_ISO = {
    "german": "de",
    "de": "de",
    "armenian": "hy",
    "hy": "hy",
    "russian": "ru",
    "ru": "ru",
    "english": "en",
    "en": "en",
}

# Fallback matches Article.language's column default.
DEFAULT_ISO = "en"


def normalize_language(value: Optional[str]) -> str:
    """Return the ISO 639-1 code for a source language name or code.

    Unknown or missing values fall back to ``DEFAULT_ISO`` ("en").
    """
    if not value:
        return DEFAULT_ISO
    return _LANGUAGE_TO_ISO.get(value.strip().lower(), DEFAULT_ISO)

"""Tests for language normalization used for article tagging at ingestion."""
import pytest


class TestNormalizeLanguage:
    """normalize_language maps source language names/codes to ISO 639-1 codes."""

    def test_german_name_maps_to_de(self):
        from src.utils.language import normalize_language
        assert normalize_language("GERMAN") == "de"

    def test_german_iso_code_passes_through(self):
        from src.utils.language import normalize_language
        assert normalize_language("de") == "de"

    def test_armenian_name_maps_to_hy(self):
        from src.utils.language import normalize_language
        assert normalize_language("ARMENIAN") == "hy"

    def test_russian_name_maps_to_ru(self):
        from src.utils.language import normalize_language
        assert normalize_language("RUSSIAN") == "ru"

    def test_english_name_maps_to_en(self):
        from src.utils.language import normalize_language
        assert normalize_language("ENGLISH") == "en"

    def test_is_case_insensitive(self):
        from src.utils.language import normalize_language
        assert normalize_language("German") == "de"
        assert normalize_language("De") == "de"

    def test_none_falls_back_to_en(self):
        from src.utils.language import normalize_language
        assert normalize_language(None) == "en"

    def test_unknown_value_falls_back_to_en(self):
        from src.utils.language import normalize_language
        assert normalize_language("klingon") == "en"

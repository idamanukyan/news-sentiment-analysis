"""LLM prompts for article analysis.

Kept separate from ``analyzer.py`` so the prompt text (the subject of language
and taxonomy tuning) can be tested in isolation, without importing the LLM
client / observability stack.

Topics are baked in at import via a ``__TOPICS__`` sentinel replace so the
runtime ``.format()`` placeholders (``{articles}`` / ``{title}`` / ``{content}``)
and the JSON braces stay untouched.
"""
from ..taxonomy import topics_for_prompt

# Optimized batch prompt (~50 tokens system overhead instead of 200-500)
BATCH_ANALYSIS_PROMPT = """Analyze these articles. For each:
1. Detect language (hy/ru/en/de)
2. Translate title to English
3. Write 1-sentence English summary
4. Sentiment: POSITIVE/NEGATIVE/NEUTRAL with score -1.0 to 1.0
5. Extract 3-5 English keywords
6. Topic (one of): __TOPICS__

Return ONLY valid JSON array, no explanation:
[{{"id": <id>, "lang": "<code>", "title_en": "<title>", "summary_en": "<summary>", "sentiment": "<label>", "score": <float>, "keywords": ["k1","k2"], "topic": "<topic>"}}]

Articles:
{articles}""".replace("__TOPICS__", topics_for_prompt())

# Single article fallback prompt (if batch fails)
SINGLE_ANALYSIS_PROMPT = """Analyze this article:
Title: {title}
Content: {content}

Return JSON: {{"lang": "hy/ru/en/de", "title_en": "...", "summary_en": "...", "sentiment": "POSITIVE/NEGATIVE/NEUTRAL", "score": -1.0 to 1.0, "keywords": [...], "topic": "one of: __TOPICS__"}}""".replace("__TOPICS__", topics_for_prompt())

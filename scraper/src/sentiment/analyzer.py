"""
Optimized Article Analyzer for AIIM

Cost optimizations applied:
- Uses Claude Haiku (~10x cheaper than Sonnet)
- Batches 5 articles per API call (~5x fewer calls)
- Deduplication: skips already-processed articles
- Content truncation: max 1500 chars per article
- Optimized prompts: minimal system prompt (~50 tokens)
- Daily budget cap: $3.50/day
"""

import json
import structlog
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from tenacity import retry, stop_after_attempt, wait_exponential
import anthropic

from ..config import get_settings
from ..models import Article, SentimentResult
from ..database import get_db
from ..budget_tracker import can_spend, add_spend, increment_stat, log_daily_report

logger = structlog.get_logger()
settings = get_settings()

# Cost optimization settings
BATCH_SIZE = 5  # Process 5 articles per API call
MAX_CONTENT_LENGTH = 1500  # Max chars per article (saves ~50-70% tokens on long articles)

# Optimized batch prompt (~50 tokens system overhead instead of 200-500)
BATCH_ANALYSIS_PROMPT = """Analyze these articles. For each:
1. Detect language (hy/ru/en)
2. Translate title to English
3. Write 1-sentence English summary
4. Sentiment: POSITIVE/NEGATIVE/NEUTRAL with score -1.0 to 1.0
5. Extract 3-5 English keywords
6. Topic: Elections/Foreign Policy/Economy/Security/Society/Media/Corruption/Other

Return ONLY valid JSON array, no explanation:
[{{"id": <id>, "lang": "<code>", "title_en": "<title>", "summary_en": "<summary>", "sentiment": "<label>", "score": <float>, "keywords": ["k1","k2"], "topic": "<topic>"}}]

Articles:
{articles}"""

# Single article fallback prompt (if batch fails)
SINGLE_ANALYSIS_PROMPT = """Analyze this article:
Title: {title}
Content: {content}

Return JSON: {{"lang": "hy/ru/en", "title_en": "...", "summary_en": "...", "sentiment": "POSITIVE/NEGATIVE/NEUTRAL", "score": -1.0 to 1.0, "keywords": [...], "topic": "..."}}"""


def confidence_to_decimal(confidence: str) -> Decimal:
    """Convert confidence string to decimal."""
    mapping = {
        "HIGH": Decimal("0.90"),
        "MEDIUM": Decimal("0.70"),
        "LOW": Decimal("0.50"),
    }
    return mapping.get(confidence.upper(), Decimal("0.70"))


def score_to_confidence(score: float) -> str:
    """Convert sentiment score to confidence level."""
    abs_score = abs(score)
    if abs_score >= 0.7:
        return "HIGH"
    elif abs_score >= 0.4:
        return "MEDIUM"
    return "LOW"


def parse_json_response(response_text: str) -> Any:
    """Parse JSON from Claude response, handling markdown code blocks."""
    text = response_text.strip()

    # Handle markdown code blocks
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last lines (``` markers)
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        if text.startswith("json"):
            text = text[4:]

    return json.loads(text.strip())


def truncate_content(content: str, max_length: int = MAX_CONTENT_LENGTH) -> str:
    """Truncate content to save tokens while keeping key info."""
    if not content:
        return ""
    if len(content) <= max_length:
        return content
    # Truncate at word boundary
    truncated = content[:max_length].rsplit(' ', 1)[0]
    return truncated + "..."


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def analyze_batch_with_claude(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Analyze a batch of articles in a single API call.

    Args:
        articles: List of dicts with 'id', 'title', 'content' keys

    Returns:
        List of analysis results with same IDs
    """
    if not can_spend():
        logger.warning("budget_exhausted_skipping_batch", article_count=len(articles))
        return []

    # Check if API key is configured
    if not settings.anthropic_api_key or len(settings.anthropic_api_key) < 10:
        logger.error("anthropic_api_key_not_configured", message="ANTHROPIC_API_KEY is not set or too short")
        return []

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Format articles for the prompt
    articles_text = ""
    for i, art in enumerate(articles, 1):
        content = truncate_content(art.get('content', '') or art.get('title', ''))
        articles_text += f"\n[Article {i}] ID:{art['id']}\nTitle: {art['title']}\nContent: {content}\n"

    prompt = BATCH_ANALYSIS_PROMPT.format(articles=articles_text)

    # Using Haiku for cost optimization (~10x cheaper than Sonnet, sufficient for translation/sentiment/clustering)
    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,  # ~300 tokens per article in batch
            messages=[{"role": "user", "content": prompt}]
        )
    except anthropic.AuthenticationError as e:
        logger.error("anthropic_authentication_error", error=str(e), message="Check ANTHROPIC_API_KEY env var")
        return []
    except anthropic.APIStatusError as e:
        logger.error("anthropic_api_error", status_code=e.status_code, error=str(e))
        raise  # Re-raise for retry
    except Exception as e:
        logger.error("anthropic_unexpected_error", error=str(e), error_type=type(e).__name__)
        raise  # Re-raise for retry

    # Track spending
    total_spend = add_spend(
        message.usage.input_tokens,
        message.usage.output_tokens
    )
    logger.info(
        "batch_api_call",
        articles=len(articles),
        input_tokens=message.usage.input_tokens,
        output_tokens=message.usage.output_tokens,
        spend_today=f"${total_spend:.4f}"
    )

    response_text = message.content[0].text.strip()

    try:
        results = parse_json_response(response_text)
        if not isinstance(results, list):
            results = [results]
        return results
    except (json.JSONDecodeError, ValueError) as e:
        logger.error("batch_parse_error", error=str(e), response=response_text[:200])
        return []


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=5))
def analyze_single_with_claude(article_id: int, title: str, content: str) -> Optional[Dict[str, Any]]:
    """
    Fallback: analyze a single article if batch fails.
    """
    if not can_spend():
        return None

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    content = truncate_content(content)
    prompt = SINGLE_ANALYSIS_PROMPT.format(title=title, content=content)

    # Using Haiku for cost optimization (~10x cheaper than Sonnet, sufficient for translation/sentiment/clustering)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}]
    )

    total_spend = add_spend(message.usage.input_tokens, message.usage.output_tokens)
    logger.info("single_api_call", article_id=article_id, spend_today=f"${total_spend:.4f}")

    try:
        result = parse_json_response(message.content[0].text)
        result['id'] = article_id
        return result
    except (json.JSONDecodeError, ValueError) as e:
        logger.error("single_parse_error", article_id=article_id, error=str(e))
        return None


def save_analysis_result(article: Article, result: Dict[str, Any], db) -> Optional[SentimentResult]:
    """Save analysis result to article and create SentimentResult."""
    try:
        # Update article with translation fields
        article.detected_language = result.get("lang", "hy")
        article.title_en = result.get("title_en", article.title)
        article.content_en = result.get("summary_en", "")[:2000]
        article.translated_at = datetime.utcnow()

        # Update LLM classification fields
        article.llm_topic = result.get("topic", "Other")
        article.llm_keywords = result.get("keywords", [])
        article.llm_subtopic = result.get("summary_en", "")[:100]
        article.llm_classified_at = datetime.utcnow()

        # Determine sentiment and confidence from score
        sentiment = result.get("sentiment", "NEUTRAL").upper()
        score = float(result.get("score", 0))
        confidence = score_to_confidence(score)

        # Create sentiment result
        sentiment_result = SentimentResult(
            article_id=article.id,
            sentiment=sentiment,
            confidence=confidence_to_decimal(confidence),
            model_version="claude-haiku-4-5-batch",
            reasoning=f"Score: {score:.2f}",
            topics=[article.llm_topic] if article.llm_topic else [],
            entities={"keywords": article.llm_keywords}
        )

        return sentiment_result

    except Exception as e:
        logger.error("save_result_error", article_id=article.id, error=str(e))
        return None


def process_unanalyzed_articles(limit: int = 50) -> int:
    """
    Process articles that haven't been analyzed yet.

    Optimizations:
    - Deduplication: skips already-translated articles
    - Batching: processes 5 articles per API call
    - Budget cap: stops if daily budget exceeded
    - Content truncation: max 1500 chars per article

    Returns:
        Number of articles processed
    """
    processed = 0
    skipped = 0

    with get_db() as db:
        # Get unanalyzed articles (no sentiment result AND no translation)
        # This is the deduplication check
        articles = db.query(Article).outerjoin(
            SentimentResult
        ).filter(
            SentimentResult.id == None,
            Article.translated_at == None  # Also skip if already translated
        ).limit(limit).all()

        if not articles:
            logger.info("no_unanalyzed_articles")
            return 0

        logger.info("found_unanalyzed_articles", count=len(articles))

        # Prepare article data for batching
        article_data = []
        for a in articles:
            # Skip articles that are already translated (deduplication)
            if a.title_en and a.title_en.strip():
                skipped += 1
                increment_stat('articles_skipped')
                logger.debug("skipping_already_translated", article_id=a.id)
                continue

            article_data.append({
                'id': a.id,
                'title': a.title or '',
                'content': a.content or a.title or ''
            })

    if not article_data:
        logger.info("all_articles_already_processed", skipped=skipped)
        return 0

    # Process in batches
    for i in range(0, len(article_data), BATCH_SIZE):
        if not can_spend():
            logger.warning("budget_exhausted_stopping", processed=processed)
            break

        batch = article_data[i:i + BATCH_SIZE]
        logger.info("processing_batch", batch_num=i // BATCH_SIZE + 1, size=len(batch))

        # Try batch processing first
        results = analyze_batch_with_claude(batch)

        # If batch failed or returned fewer results, try individual fallback
        if len(results) < len(batch):
            logger.warning("batch_incomplete_using_fallback",
                          expected=len(batch), got=len(results))

            # Create a set of successfully processed IDs
            processed_ids = {r.get('id') for r in results if r.get('id')}

            # Process missing articles individually
            for art in batch:
                if art['id'] not in processed_ids:
                    single_result = analyze_single_with_claude(
                        art['id'], art['title'], art['content']
                    )
                    if single_result:
                        results.append(single_result)

        # Save results to database
        for result in results:
            article_id = result.get('id')
            if not article_id:
                continue

            try:
                with get_db() as db:
                    article = db.query(Article).filter(Article.id == article_id).first()
                    if not article:
                        continue

                    # Check again if already processed (race condition protection)
                    existing = db.query(SentimentResult).filter(
                        SentimentResult.article_id == article_id
                    ).first()
                    if existing:
                        skipped += 1
                        continue

                    sentiment_result = save_analysis_result(article, result, db)
                    if sentiment_result:
                        db.add(sentiment_result)
                        processed += 1
                        increment_stat('articles_processed')

            except Exception as e:
                logger.error("save_article_error", article_id=article_id, error=str(e))

    logger.info("batch_processing_complete", processed=processed, skipped=skipped)
    log_daily_report(processed, skipped)
    return processed


def process_untranslated_articles(limit: int = 50) -> int:
    """
    Backfill: Process articles that have sentiment but no translation.

    This handles historical articles processed before translation was added.
    Uses same batching and budget optimizations.
    """
    processed = 0
    skipped = 0

    with get_db() as db:
        # Get articles with sentiment but no translation
        articles = db.query(Article).join(
            SentimentResult
        ).filter(
            Article.translated_at == None,
            Article.title_en == None
        ).limit(limit).all()

        if not articles:
            logger.info("no_untranslated_articles")
            return 0

        logger.info("found_untranslated_articles", count=len(articles))

        article_data = []
        for a in articles:
            # Skip if somehow already has translation
            if a.title_en and a.title_en.strip():
                skipped += 1
                continue

            article_data.append({
                'id': a.id,
                'title': a.title or '',
                'content': a.content or a.title or ''
            })

    if not article_data:
        return 0

    # Process in batches (same as above)
    for i in range(0, len(article_data), BATCH_SIZE):
        if not can_spend():
            logger.warning("budget_exhausted_stopping_backfill", processed=processed)
            break

        batch = article_data[i:i + BATCH_SIZE]
        results = analyze_batch_with_claude(batch)

        # Fallback for failed items
        if len(results) < len(batch):
            processed_ids = {r.get('id') for r in results if r.get('id')}
            for art in batch:
                if art['id'] not in processed_ids:
                    single_result = analyze_single_with_claude(
                        art['id'], art['title'], art['content']
                    )
                    if single_result:
                        results.append(single_result)

        # Save results (only update translation fields, don't duplicate sentiment)
        for result in results:
            article_id = result.get('id')
            if not article_id:
                continue

            try:
                with get_db() as db:
                    article = db.query(Article).filter(Article.id == article_id).first()
                    if not article or article.translated_at:
                        continue

                    # Update only translation fields
                    article.detected_language = result.get("lang", "hy")
                    article.title_en = result.get("title_en", article.title)
                    article.content_en = result.get("summary_en", "")[:2000]
                    article.translated_at = datetime.utcnow()
                    article.llm_topic = result.get("topic", "Other")
                    article.llm_keywords = result.get("keywords", [])
                    article.llm_classified_at = datetime.utcnow()

                    processed += 1
                    increment_stat('articles_processed')

            except Exception as e:
                logger.error("backfill_save_error", article_id=article_id, error=str(e))

    logger.info("backfill_complete", processed=processed, skipped=skipped)
    return processed


# Legacy function kept for compatibility
def analyze_article(article: Article, db=None) -> Optional[SentimentResult]:
    """
    Single article analysis - use process_unanalyzed_articles() instead for batching.

    This is kept for compatibility but processes one article at a time.
    """
    if not article.content and not article.title:
        return None

    if not can_spend():
        return None

    result = analyze_single_with_claude(
        article.id,
        article.title or '',
        article.content or article.title or ''
    )

    if not result:
        return None

    return save_analysis_result(article, result, db)

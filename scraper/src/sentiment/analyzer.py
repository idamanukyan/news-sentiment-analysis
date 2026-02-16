import json
import structlog
from typing import Optional
from decimal import Decimal
from tenacity import retry, stop_after_attempt, wait_exponential
import anthropic

from ..config import get_settings
from ..models import Article, SentimentResult
from ..database import get_db

logger = structlog.get_logger()
settings = get_settings()

SENTIMENT_PROMPT = """Analyze the sentiment of this news article.

Article Title: {title}
Article Text: {content}

Classify the overall sentiment as:
- POSITIVE: Optimistic tone, good news, achievements, progress
- NEGATIVE: Critical tone, bad news, failures, problems, accusations
- NEUTRAL: Factual reporting without emotional tone

Also identify:
1. Primary topic (1-3 words)
2. Key entities mentioned (people, organizations)
3. Confidence level (HIGH, MEDIUM, LOW)

Respond ONLY with valid JSON in this exact format:
{{
  "sentiment": "POSITIVE|NEGATIVE|NEUTRAL",
  "confidence": "HIGH|MEDIUM|LOW",
  "topic": "string",
  "entities": ["string"],
  "reasoning": "Brief explanation in English"
}}"""


def confidence_to_decimal(confidence: str) -> Decimal:
    """Convert confidence string to decimal."""
    mapping = {
        "HIGH": Decimal("0.90"),
        "MEDIUM": Decimal("0.70"),
        "LOW": Decimal("0.50"),
    }
    return mapping.get(confidence.upper(), Decimal("0.70"))


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def analyze_with_claude(title: str, content: str) -> dict:
    """Analyze sentiment using Claude API."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Truncate content if too long
    max_content_length = 4000
    if len(content) > max_content_length:
        content = content[:max_content_length] + "..."

    prompt = SENTIMENT_PROMPT.format(title=title, content=content)

    message = client.messages.create(
        model="claude-3-haiku-20240307",  # Use Haiku for cost efficiency
        max_tokens=500,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    response_text = message.content[0].text.strip()

    # Parse JSON response
    try:
        # Handle potential markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        logger.error("json_parse_error", response=response_text, error=str(e))
        # Return default response
        return {
            "sentiment": "NEUTRAL",
            "confidence": "LOW",
            "topic": "unknown",
            "entities": [],
            "reasoning": "Failed to parse response"
        }


def analyze_article(article: Article) -> Optional[SentimentResult]:
    """Analyze sentiment of a single article."""
    if not article.content and not article.title:
        logger.warning("empty_article", article_id=article.id)
        return None

    content = article.content or article.title

    try:
        result = analyze_with_claude(article.title, content)

        sentiment_result = SentimentResult(
            article_id=article.id,
            sentiment=result["sentiment"],
            confidence=confidence_to_decimal(result["confidence"]),
            model_version="claude-3-haiku",
            reasoning=result.get("reasoning"),
            topics=[result.get("topic")] if result.get("topic") else [],
            entities={"names": result.get("entities", [])}
        )

        logger.info(
            "sentiment_analyzed",
            article_id=article.id,
            sentiment=result["sentiment"],
            confidence=result["confidence"]
        )

        return sentiment_result

    except Exception as e:
        logger.error("sentiment_analysis_error", article_id=article.id, error=str(e))
        return None


def process_unanalyzed_articles(limit: int = 50):
    """Process articles that haven't been analyzed yet."""
    with get_db() as db:
        # Get unanalyzed articles
        articles = db.query(Article).outerjoin(
            SentimentResult
        ).filter(
            SentimentResult.id == None
        ).limit(limit).all()

        logger.info("processing_articles", count=len(articles))

        processed = 0
        for article in articles:
            result = analyze_article(article)
            if result:
                db.add(result)
                processed += 1

        logger.info("sentiment_processing_complete", processed=processed)
        return processed

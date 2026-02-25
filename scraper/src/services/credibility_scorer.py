"""
Source Credibility Scoring for AIIM

Computes a reliability score (0.0 - 1.0) for each source based on observable
historical patterns. This helps analysts quickly assess how trustworthy content
from a source is likely to be.

Scoring Factors (all derived from existing data):
1. Sentiment Balance (25%): Balanced sentiment = more credible
2. Volume Regularity (25%): Steady publishing rate = more credible
3. Narrative Diversity (25%): Covers multiple topics = more credible
4. Coordination Clean (25%): Less involvement in coordinated activity = more credible
"""

import json
import structlog
from math import log2
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from sqlalchemy import text

from ..database import get_db

logger = structlog.get_logger()


def calculate_sentiment_balance(db, source_id: int) -> float:
    """
    Calculate entropy-based sentiment balance score.

    Higher entropy (more balanced sentiment distribution) = higher score.
    All one sentiment = low score; mix of positive/negative/neutral = high score.
    """
    result = db.execute(text("""
        SELECT sr.sentiment, COUNT(*) as count
        FROM articles a
        JOIN sentiment_results sr ON a.id = sr.article_id
        WHERE a.source_id = :sid
        AND sr.sentiment IS NOT NULL
        GROUP BY sr.sentiment
    """), {"sid": source_id}).fetchall()

    if not result:
        return 0.5  # No sentiment data, neutral score

    total = sum(row.count for row in result)
    if total == 0:
        return 0.5

    # Calculate entropy
    probs = [row.count / total for row in result]
    max_entropy = log2(4)  # Maximum 4 sentiment categories
    entropy = -sum(p * log2(p) for p in probs if p > 0)

    return round(entropy / max_entropy, 3)


def calculate_volume_regularity(db, source_id: int) -> float:
    """
    Calculate publishing volume regularity score.

    Steady publishing rate = high score.
    Erratic bursts (0, 0, 0, 50, 0, 0) = low score.

    Uses coefficient of variation: lower CV = more regular = higher score.
    """
    result = db.execute(text("""
        SELECT DATE(published_at) as pub_date, COUNT(*) as count
        FROM articles
        WHERE source_id = :sid
        AND published_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(published_at)
        ORDER BY pub_date
    """), {"sid": source_id}).fetchall()

    if len(result) < 4:
        return 0.5  # Not enough data

    counts = [row.count for row in result]

    # Calculate coefficient of variation
    mean = sum(counts) / len(counts)
    if mean == 0:
        return 0.5

    variance = sum((c - mean) ** 2 for c in counts) / len(counts)
    std = variance ** 0.5
    cv = std / mean

    # Convert CV to score (lower CV = higher score)
    # CV of 0 = perfectly regular = score 1.0
    # CV of 1 = standard dev equals mean = score 0.0
    score = max(0.0, 1.0 - cv)
    return round(score, 3)


def calculate_narrative_diversity(db, source_id: int) -> float:
    """
    Calculate narrative/topic diversity score.

    Covering multiple topics/narratives = high score.
    All articles in one narrative = low score.
    """
    result = db.execute(text("""
        SELECT
            COUNT(DISTINCT narrative_id) as distinct_narratives,
            COUNT(*) as total_with_narrative
        FROM articles
        WHERE source_id = :sid
        AND narrative_id IS NOT NULL
    """), {"sid": source_id}).fetchone()

    if not result or result.total_with_narrative == 0:
        return 0.5  # No narrative data

    # Diversity = distinct narratives / (total articles * target_ratio)
    # A source covering 5 narratives across 20 articles = good diversity
    # Target: roughly 1 narrative per 4 articles
    target_ratio = 0.25
    diversity = min(1.0, result.distinct_narratives / (result.total_with_narrative * target_ratio))

    return round(diversity, 3)


def calculate_coordination_clean(db, source_id: int, source_name: str) -> float:
    """
    Calculate coordination clean score.

    Sources frequently involved in coordination events = lower score.
    Sources never in coordination events = higher score.
    """
    # Count articles from this source
    total_articles = db.execute(text("""
        SELECT COUNT(*) FROM articles WHERE source_id = :sid
    """), {"sid": source_id}).scalar() or 0

    if total_articles == 0:
        return 0.5

    # Count coordination events involving this source
    # The sources_involved column is JSONB containing an array of source names
    coord_count = db.execute(text("""
        SELECT COUNT(*) FROM coordination_events
        WHERE sources_involved::text ILIKE :pattern
    """), {"pattern": f'%"{source_name}"%'}).scalar() or 0

    # Each coordination event is weighted as 3 "strikes"
    # Score decreases with more coordination involvement
    penalty_ratio = (coord_count * 3) / total_articles
    score = max(0.0, 1.0 - penalty_ratio)

    return round(score, 3)


def calculate_source_credibility() -> int:
    """
    Calculate credibility scores for all active sources.

    Returns the number of sources updated.
    """
    logger.info("starting_credibility_calculation")
    sources_updated = 0

    with get_db() as db:
        # Get all active sources
        sources = db.execute(text("""
            SELECT id, name FROM sources WHERE active = true
        """)).fetchall()

        logger.info("found_sources_to_score", count=len(sources))

        for source in sources:
            source_id = source.id
            source_name = source.name

            try:
                # Calculate each factor
                factors = {}

                factors['sentiment_balance'] = calculate_sentiment_balance(db, source_id)
                factors['volume_regularity'] = calculate_volume_regularity(db, source_id)
                factors['narrative_diversity'] = calculate_narrative_diversity(db, source_id)
                factors['coordination_clean'] = calculate_coordination_clean(db, source_id, source_name)

                # Weighted final score (equal weights)
                final_score = (
                    factors['sentiment_balance'] * 0.25 +
                    factors['volume_regularity'] * 0.25 +
                    factors['narrative_diversity'] * 0.25 +
                    factors['coordination_clean'] * 0.25
                )

                # Update source
                db.execute(text("""
                    UPDATE sources
                    SET credibility_score = :score,
                        credibility_factors = :factors,
                        credibility_updated_at = NOW()
                    WHERE id = :sid
                """), {
                    "score": round(final_score, 3),
                    "factors": json.dumps(factors),
                    "sid": source_id
                })

                sources_updated += 1

                logger.debug("source_credibility_calculated",
                           source=source_name,
                           score=round(final_score, 3),
                           factors=factors)

            except Exception as e:
                logger.error("source_credibility_error",
                           source_id=source_id,
                           source_name=source_name,
                           error=str(e))
                continue

        db.commit()

    logger.info("credibility_calculation_complete", sources_updated=sources_updated)
    return sources_updated


def get_credibility_stats() -> Dict[str, Any]:
    """Get credibility scoring statistics."""
    with get_db() as db:
        # Distribution of scores
        high = db.execute(text("""
            SELECT COUNT(*) FROM sources
            WHERE credibility_score >= 0.7 AND active = true
        """)).scalar() or 0

        medium = db.execute(text("""
            SELECT COUNT(*) FROM sources
            WHERE credibility_score >= 0.4 AND credibility_score < 0.7 AND active = true
        """)).scalar() or 0

        low = db.execute(text("""
            SELECT COUNT(*) FROM sources
            WHERE credibility_score < 0.4 AND active = true
        """)).scalar() or 0

        # Average score
        avg_score = db.execute(text("""
            SELECT AVG(credibility_score) FROM sources WHERE active = true
        """)).scalar()

        # Top and bottom sources
        top_sources = db.execute(text("""
            SELECT name, credibility_score
            FROM sources
            WHERE active = true AND credibility_score IS NOT NULL
            ORDER BY credibility_score DESC
            LIMIT 5
        """)).fetchall()

        bottom_sources = db.execute(text("""
            SELECT name, credibility_score
            FROM sources
            WHERE active = true AND credibility_score IS NOT NULL
            ORDER BY credibility_score ASC
            LIMIT 5
        """)).fetchall()

        return {
            "distribution": {
                "high": high,
                "medium": medium,
                "low": low
            },
            "average_score": round(avg_score or 0.5, 3),
            "top_sources": [(s.name, round(s.credibility_score, 2)) for s in top_sources],
            "bottom_sources": [(s.name, round(s.credibility_score, 2)) for s in bottom_sources]
        }


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "stats":
        stats = get_credibility_stats()
        print("Credibility Stats:")
        print(f"  Distribution: {stats['distribution']}")
        print(f"  Average Score: {stats['average_score']}")
        print(f"  Top Sources: {stats['top_sources']}")
        print(f"  Low Sources: {stats['bottom_sources']}")
    else:
        updated = calculate_source_credibility()
        print(f"Credibility calculation complete: {updated} sources updated")

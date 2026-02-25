"""
Coordination Detection for AIIM

Detects when multiple sources publish suspiciously similar content within a short
time window - a key indicator of coordinated information operations.

Algorithm:
1. For each active narrative, get articles from the last 48 hours
2. Use sliding 2-hour windows to find clusters of 3+ articles from 3+ sources
3. Calculate TIMING score (how close together were publications)
4. Calculate CONTENT similarity score (Jaccard on English text)
5. Combined score = (timing * 0.4) + (content * 0.6)
6. If combined >= 0.6, create a coordination event and threat alert
"""

import json
import structlog
from datetime import datetime, timedelta
from collections import defaultdict
from typing import List, Dict, Any, Optional, Tuple

from sqlalchemy import text

from ..database import get_db

logger = structlog.get_logger()


def calculate_timing_score(published_times: List[datetime], window_hours: float = 2.0) -> float:
    """
    Calculate how suspiciously close together the publication times are.

    Score 1.0 = all articles published at the same moment
    Score 0.0 = articles spread evenly across the window
    """
    if len(published_times) < 2:
        return 0.0

    times = sorted(published_times)
    gaps_hours = []

    for i in range(len(times) - 1):
        gap = (times[i + 1] - times[i]).total_seconds() / 3600.0
        gaps_hours.append(gap)

    avg_gap = sum(gaps_hours) / len(gaps_hours)
    # Score inversely proportional to average gap
    score = max(0.0, 1.0 - (avg_gap / window_hours))
    return score


def calculate_content_similarity(texts: List[set]) -> float:
    """
    Calculate average Jaccard similarity across all pairs of texts.

    Uses word sets from English-translated titles/content.
    """
    if len(texts) < 2:
        return 0.0

    similarities = []
    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            if texts[i] and texts[j]:
                intersection = texts[i] & texts[j]
                union = texts[i] | texts[j]
                if union:
                    similarities.append(len(intersection) / len(union))

    if not similarities:
        return 0.0

    return sum(similarities) / len(similarities)


def extract_words(title: Optional[str], content: Optional[str]) -> set:
    """Extract a set of lowercase words from title and content."""
    text = f"{title or ''} {content or ''}".lower()
    # Simple word extraction - could be improved with NLP
    words = set(word.strip() for word in text.split() if len(word.strip()) > 2)
    return words


def detect_coordination(lookback_hours: int = 48) -> int:
    """
    Detect coordinated publishing patterns across sources.

    Returns the number of coordination events created.
    """
    logger.info("starting_coordination_detection", lookback_hours=lookback_hours)

    cutoff = datetime.utcnow() - timedelta(hours=lookback_hours)
    events_created = 0

    with get_db() as db:
        # Get active narratives with recent articles
        narratives = db.execute(text("""
            SELECT n.id, n.name, n.organization_id
            FROM narratives n
            WHERE n.status = 'ACTIVE'
            AND EXISTS (
                SELECT 1 FROM articles a
                WHERE a.narrative_id = n.id
                AND a.published_at > :cutoff
            )
        """), {"cutoff": cutoff}).fetchall()

        logger.info("found_narratives_to_check", count=len(narratives))

        for narrative in narratives:
            narrative_id = narrative.id
            narrative_name = narrative.name
            org_id = narrative.organization_id

            # Get recent articles for this narrative
            articles = db.execute(text("""
                SELECT
                    a.id,
                    a.source_id,
                    s.name as source_name,
                    s.political_leaning,
                    a.published_at,
                    a.title_en,
                    a.content_en
                FROM articles a
                JOIN sources s ON a.source_id = s.id
                WHERE a.narrative_id = :nid
                AND a.published_at > :cutoff
                AND a.title_en IS NOT NULL
                ORDER BY a.published_at
            """), {"nid": narrative_id, "cutoff": cutoff}).fetchall()

            if len(articles) < 3:
                continue

            # Sliding window analysis
            window_hours = 2
            checked_windows = set()  # Avoid duplicate checks

            for i, anchor in enumerate(articles):
                window_end = anchor.published_at + timedelta(hours=window_hours)

                # Get articles in this window
                window_articles = [
                    a for a in articles
                    if anchor.published_at <= a.published_at <= window_end
                ]

                unique_sources = set(a.source_id for a in window_articles)

                # Need 3+ articles from 3+ different sources
                if len(window_articles) < 3 or len(unique_sources) < 3:
                    continue

                # Create a window key to avoid duplicate checks
                window_key = (
                    min(a.id for a in window_articles),
                    max(a.id for a in window_articles)
                )
                if window_key in checked_windows:
                    continue
                checked_windows.add(window_key)

                # Calculate TIMING score
                times = [a.published_at for a in window_articles]
                timing_score = calculate_timing_score(times, window_hours)

                # Calculate CONTENT similarity score
                texts = [
                    extract_words(a.title_en, a.content_en)
                    for a in window_articles
                ]
                content_score = calculate_content_similarity(texts)

                # Combined coordination score
                combined_score = (timing_score * 0.4) + (content_score * 0.6)

                if combined_score < 0.6:
                    continue

                # Determine coordination type
                if timing_score > 0.7 and content_score > 0.5:
                    coord_type = 'TIMING_AND_CONTENT'
                elif timing_score > 0.7:
                    coord_type = 'TIMING'
                else:
                    coord_type = 'CONTENT'

                source_names = list(set(a.source_name for a in window_articles))
                article_ids = [a.id for a in window_articles]

                # Check for existing similar event in last 24h
                existing = db.execute(text("""
                    SELECT id FROM coordination_events
                    WHERE narrative_id = :nid
                    AND detected_at > :recent
                    AND organization_id = :org_id
                """), {
                    "nid": narrative_id,
                    "recent": datetime.utcnow() - timedelta(hours=24),
                    "org_id": org_id
                }).fetchone()

                if existing:
                    logger.debug("skipping_duplicate_event",
                               narrative_id=narrative_id,
                               existing_event=existing.id)
                    continue

                # Create coordination event
                description = (
                    f"Coordinated {coord_type.lower().replace('_', ' ')}: "
                    f"{len(unique_sources)} sources published {len(window_articles)} "
                    f"similar articles within {window_hours}h about '{narrative_name}'"
                )

                event_result = db.execute(text("""
                    INSERT INTO coordination_events
                    (organization_id, narrative_id, time_window_hours, source_count,
                     article_count, similarity_score, coordination_type, description,
                     sources_involved, article_ids, status)
                    VALUES
                    (:org_id, :nid, :window, :src_count, :art_count, :score,
                     :ctype, :desc, :sources, :aids, 'ACTIVE')
                    RETURNING id
                """), {
                    "org_id": org_id,
                    "nid": narrative_id,
                    "window": window_hours,
                    "src_count": len(unique_sources),
                    "art_count": len(window_articles),
                    "score": round(combined_score, 3),
                    "ctype": coord_type,
                    "desc": description,
                    "sources": json.dumps(source_names),
                    "aids": json.dumps(article_ids)
                })

                event_id = event_result.fetchone()[0]

                # Update articles with coordination info
                for article in window_articles:
                    db.execute(text("""
                        UPDATE articles
                        SET coordination_event_id = :event_id,
                            coordination_score = :score
                        WHERE id = :article_id
                    """), {
                        "event_id": event_id,
                        "score": round(combined_score, 3),
                        "article_id": article.id
                    })

                # Create threat alert
                severity = 'CRITICAL' if combined_score > 0.8 else 'HIGH'
                source_preview = ', '.join(source_names[:3])
                if len(source_names) > 3:
                    source_preview += '...'

                alert_title = f"Coordination detected: {narrative_name[:100]}"
                alert_desc = (
                    f"{len(unique_sources)} sources ({source_preview}) published "
                    f"similar content within {window_hours} hours. "
                    f"Coordination score: {combined_score:.0%}"
                )

                db.execute(text("""
                    INSERT INTO threat_alerts
                    (organization_id, narrative_id, alert_type, severity, title,
                     description, status, triggered_at, metadata)
                    VALUES
                    (:org_id, :nid, 'COORDINATED', :severity, :title,
                     :desc, 'ACTIVE', NOW(), :metadata)
                """), {
                    "org_id": org_id,
                    "nid": narrative_id,
                    "severity": severity,
                    "title": alert_title[:500],
                    "desc": alert_desc,
                    "metadata": json.dumps({
                        "coordination_event_id": event_id,
                        "coordination_type": coord_type,
                        "similarity_score": round(combined_score, 3),
                        "source_count": len(unique_sources),
                        "article_count": len(window_articles),
                        "sources": source_names
                    })
                })

                events_created += 1
                logger.warning("coordination_detected",
                             narrative=narrative_name,
                             sources=len(unique_sources),
                             articles=len(window_articles),
                             score=f"{combined_score:.1%}",
                             type=coord_type)

                # One event per narrative per run to avoid flooding
                break

        db.commit()

    logger.info("coordination_detection_complete", events_created=events_created)
    return events_created


def get_coordination_stats(days: int = 7) -> Dict[str, Any]:
    """Get coordination detection statistics."""
    since = datetime.utcnow() - timedelta(days=days)

    with get_db() as db:
        # Total events
        total = db.execute(text("""
            SELECT COUNT(*) FROM coordination_events
            WHERE detected_at >= :since
        """), {"since": since}).scalar()

        # By type
        by_type = db.execute(text("""
            SELECT coordination_type, COUNT(*) as count
            FROM coordination_events
            WHERE detected_at >= :since
            GROUP BY coordination_type
        """), {"since": since}).fetchall()

        # By status
        by_status = db.execute(text("""
            SELECT status, COUNT(*) as count
            FROM coordination_events
            WHERE detected_at >= :since
            GROUP BY status
        """), {"since": since}).fetchall()

        # Average score
        avg_score = db.execute(text("""
            SELECT AVG(similarity_score) FROM coordination_events
            WHERE detected_at >= :since
        """), {"since": since}).scalar()

        return {
            "total_events": total or 0,
            "by_type": {row.coordination_type: row.count for row in by_type},
            "by_status": {row.status: row.count for row in by_status},
            "avg_similarity_score": round(avg_score or 0, 3),
            "period_days": days
        }


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "stats":
        stats = get_coordination_stats()
        print(f"Coordination Stats (last 7 days):")
        print(f"  Total events: {stats['total_events']}")
        print(f"  By type: {stats['by_type']}")
        print(f"  By status: {stats['by_status']}")
        print(f"  Avg score: {stats['avg_similarity_score']:.1%}")
    else:
        events = detect_coordination()
        print(f"Coordination detection complete: {events} events created")

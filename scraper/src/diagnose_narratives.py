#!/usr/bin/env python3
"""
Diagnostic script for narrative detection issues.

Run with: python -m src.diagnose_narratives
Or from scraper directory: python src/diagnose_narratives.py
"""

from datetime import datetime, timedelta
from sqlalchemy import text
from collections import defaultdict

from .database import get_db
from .budget_tracker import get_budget_status, get_today_spend
from .config import get_settings


def diagnose():
    """Run full diagnostics on narrative detection system."""
    settings = get_settings()

    print("\n" + "="*60)
    print("NARRATIVE DETECTION DIAGNOSTICS")
    print("="*60)

    # 1. Check API Key
    print("\n[1] API KEY STATUS")
    print("-" * 40)
    has_key = bool(settings.anthropic_api_key and len(settings.anthropic_api_key) > 10)
    if has_key:
        print(f"  ANTHROPIC_API_KEY: Configured ({settings.anthropic_api_key[:15]}...)")
    else:
        print("  ANTHROPIC_API_KEY: NOT SET OR INVALID")
        print("  >>> This is likely the issue! AI features won't work.")

    # 2. Check Budget
    print("\n[2] BUDGET STATUS")
    print("-" * 40)
    budget = get_budget_status()
    print(f"  Date: {budget['date']}")
    print(f"  Spent today: ${budget['spent']:.4f}")
    print(f"  Daily budget: ${budget['budget']:.2f}")
    print(f"  Remaining: ${budget['remaining']:.4f}")
    print(f"  Used: {budget['percent_used']:.1f}%")
    if budget['percent_used'] >= 100:
        print("  >>> Budget exhausted! No more API calls today.")

    # 3. Check Article Classification Status
    print("\n[3] ARTICLE CLASSIFICATION STATUS")
    print("-" * 40)

    with get_db() as db:
        # Total articles
        total = db.execute(text("SELECT COUNT(*) FROM articles")).scalar()
        print(f"  Total articles: {total}")

        # Articles with llm_topic
        classified = db.execute(text(
            "SELECT COUNT(*) FROM articles WHERE llm_topic IS NOT NULL"
        )).scalar()
        print(f"  Classified (llm_topic set): {classified}")

        # Articles without llm_topic
        unclassified = db.execute(text(
            "SELECT COUNT(*) FROM articles WHERE llm_topic IS NULL"
        )).scalar()
        print(f"  Unclassified (llm_topic NULL): {unclassified}")

        # Articles classified as 'Unclassified' (excluded from clustering)
        unclassified_topic = db.execute(text(
            "SELECT COUNT(*) FROM articles WHERE llm_topic = 'Unclassified'"
        )).scalar()
        print(f"  Classified as 'Unclassified' (excluded): {unclassified_topic}")

        # Recent articles (last 7 days)
        since = datetime.utcnow() - timedelta(days=7)
        recent_total = db.execute(text(
            "SELECT COUNT(*) FROM articles WHERE published_at >= :since"
        ), {"since": since}).scalar()
        print(f"\n  Articles in last 7 days: {recent_total}")

        recent_classified = db.execute(text("""
            SELECT COUNT(*) FROM articles
            WHERE published_at >= :since
            AND llm_topic IS NOT NULL
            AND llm_topic != 'Unclassified'
        """), {"since": since}).scalar()
        print(f"  Classified (last 7 days, valid topics): {recent_classified}")

    # 4. Topic Distribution (last 7 days)
    print("\n[4] TOPIC DISTRIBUTION (Last 7 Days)")
    print("-" * 40)

    with get_db() as db:
        result = db.execute(text("""
            SELECT llm_topic, COUNT(*) as count
            FROM articles
            WHERE published_at >= :since
            AND llm_topic IS NOT NULL
            GROUP BY llm_topic
            ORDER BY count DESC
        """), {"since": since})

        topics = list(result)
        if topics:
            for row in topics:
                cluster_eligible = "YES" if row.count >= 3 else "NO (need 3+)"
                print(f"  {row.llm_topic}: {row.count} articles - Can cluster: {cluster_eligible}")
        else:
            print("  No classified articles found!")
            print("  >>> This is the issue! Articles need classification first.")

    # 5. Check Existing Narratives
    print("\n[5] EXISTING NARRATIVES")
    print("-" * 40)

    with get_db() as db:
        # Count by status
        result = db.execute(text("""
            SELECT status, COUNT(*) as count
            FROM narratives
            GROUP BY status
        """))

        statuses = list(result)
        if statuses:
            for row in statuses:
                print(f"  {row.status}: {row.count}")
        else:
            print("  No narratives in database!")

        # Auto-generated vs manual
        auto = db.execute(text(
            "SELECT COUNT(*) FROM narratives WHERE auto_generated = true"
        )).scalar()
        manual = db.execute(text(
            "SELECT COUNT(*) FROM narratives WHERE auto_generated = false OR auto_generated IS NULL"
        )).scalar()
        print(f"\n  Auto-generated: {auto}")
        print(f"  Manual: {manual}")

        # Recent pending review
        pending = db.execute(text("""
            SELECT id, name, article_count, threat_level, first_seen
            FROM narratives
            WHERE status = 'PENDING_REVIEW'
            ORDER BY first_seen DESC
            LIMIT 5
        """))

        pending_list = list(pending)
        if pending_list:
            print(f"\n  Recent PENDING_REVIEW narratives:")
            for row in pending_list:
                print(f"    - [{row.id}] {row.name[:50]}... ({row.article_count} articles, {row.threat_level})")

    # 6. Simulate Clustering
    print("\n[6] CLUSTER SIMULATION")
    print("-" * 40)

    with get_db() as db:
        result = db.execute(text("""
            SELECT llm_topic, COUNT(*) as count
            FROM articles
            WHERE published_at >= :since
            AND llm_topic IS NOT NULL
            AND llm_topic != 'Unclassified'
            GROUP BY llm_topic
            HAVING COUNT(*) >= 3
            ORDER BY count DESC
        """), {"since": since})

        eligible_topics = list(result)
        if eligible_topics:
            print(f"  Topics eligible for clustering (3+ articles):")
            for row in eligible_topics:
                print(f"    - {row.llm_topic}: {row.count} articles")
            print(f"\n  >>> {len(eligible_topics)} topic(s) can form clusters!")
        else:
            print("  No topics have 3+ articles in the last 7 days.")
            print("  >>> Cannot create any clusters with current data.")

    # Summary
    print("\n" + "="*60)
    print("DIAGNOSIS SUMMARY")
    print("="*60)

    issues = []
    if not has_key:
        issues.append("ANTHROPIC_API_KEY not configured")
    if budget['percent_used'] >= 100:
        issues.append("Daily API budget exhausted")
    if recent_classified == 0:
        issues.append("No classified articles in last 7 days")
    if not eligible_topics:
        issues.append("No topics with 3+ articles for clustering")

    if issues:
        print("\nISSUES FOUND:")
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. {issue}")
    else:
        print("\nNo obvious issues found. Check Render logs for errors.")

    print("\n")


if __name__ == "__main__":
    diagnose()

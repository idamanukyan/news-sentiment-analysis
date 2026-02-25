"""
API Budget Tracker for AIIM

Tracks daily API spending and prevents overspending.
Target: $100/month total = ~$3.50/day
"""

import json
import os
import structlog
from datetime import date
from pathlib import Path

logger = structlog.get_logger()

# Budget configuration
DAILY_BUDGET_USD = 3.50  # $3.50/day = ~$105/month

# Haiku pricing (as of 2024)
COST_PER_1K_INPUT_TOKENS = 0.0008   # $0.80 per million input
COST_PER_1K_OUTPUT_TOKENS = 0.004   # $4.00 per million output

# Track spend in a file in the scraper directory
SPEND_FILE = Path(__file__).parent.parent / "daily_api_spend.json"

# Daily statistics
_daily_stats = {
    'articles_processed': 0,
    'articles_skipped': 0,
    'api_calls': 0,
    'input_tokens': 0,
    'output_tokens': 0,
}


def reset_daily_stats():
    """Reset daily statistics."""
    global _daily_stats
    _daily_stats = {
        'articles_processed': 0,
        'articles_skipped': 0,
        'api_calls': 0,
        'input_tokens': 0,
        'output_tokens': 0,
    }


def increment_stat(key: str, value: int = 1):
    """Increment a daily statistic."""
    global _daily_stats
    _daily_stats[key] = _daily_stats.get(key, 0) + value


def get_stats():
    """Get current daily statistics."""
    return _daily_stats.copy()


def get_today_spend() -> float:
    """Get total API spend for today in USD."""
    try:
        with open(SPEND_FILE, 'r') as f:
            data = json.load(f)
        if data.get('date') == str(date.today()):
            return data.get('spend', 0.0)
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    return 0.0


def add_spend(input_tokens: int, output_tokens: int) -> float:
    """
    Log API spend and return total spend for today.

    Args:
        input_tokens: Number of input tokens used
        output_tokens: Number of output tokens used

    Returns:
        Total spend for today in USD
    """
    cost = (input_tokens / 1000 * COST_PER_1K_INPUT_TOKENS) + \
           (output_tokens / 1000 * COST_PER_1K_OUTPUT_TOKENS)

    today = str(date.today())

    try:
        with open(SPEND_FILE, 'r') as f:
            data = json.load(f)
        if data.get('date') != today:
            data = {'date': today, 'spend': 0.0, 'calls': 0, 'input_tokens': 0, 'output_tokens': 0}
    except (FileNotFoundError, json.JSONDecodeError):
        data = {'date': today, 'spend': 0.0, 'calls': 0, 'input_tokens': 0, 'output_tokens': 0}

    data['spend'] += cost
    data['calls'] = data.get('calls', 0) + 1
    data['input_tokens'] = data.get('input_tokens', 0) + input_tokens
    data['output_tokens'] = data.get('output_tokens', 0) + output_tokens

    with open(SPEND_FILE, 'w') as f:
        json.dump(data, f, indent=2)

    # Update in-memory stats
    increment_stat('api_calls')
    increment_stat('input_tokens', input_tokens)
    increment_stat('output_tokens', output_tokens)

    return data['spend']


def can_spend() -> bool:
    """Check if we're under the daily budget."""
    current = get_today_spend()
    can = current < DAILY_BUDGET_USD
    if not can:
        logger.warning(
            "daily_budget_exhausted",
            spent=f"${current:.4f}",
            budget=f"${DAILY_BUDGET_USD:.2f}"
        )
    return can


def get_budget_status() -> dict:
    """Get current budget status."""
    spent = get_today_spend()
    remaining = max(0, DAILY_BUDGET_USD - spent)
    return {
        'date': str(date.today()),
        'spent': spent,
        'remaining': remaining,
        'budget': DAILY_BUDGET_USD,
        'percent_used': (spent / DAILY_BUDGET_USD) * 100 if DAILY_BUDGET_USD > 0 else 0,
    }


def log_daily_report(processed: int = 0, skipped: int = 0):
    """Log a daily cost report."""
    stats = get_stats()
    budget = get_budget_status()

    # Use provided values or fall back to tracked stats
    articles_processed = processed or stats.get('articles_processed', 0)
    articles_skipped = skipped or stats.get('articles_skipped', 0)

    report = f"""
=== AIIM Daily Cost Report ===
Date: {budget['date']}
Articles processed: {articles_processed}
Articles skipped (cached): {articles_skipped}
API calls made: {stats.get('api_calls', 0)}
Tokens used: {stats.get('input_tokens', 0):,} input / {stats.get('output_tokens', 0):,} output
Estimated cost today: ${budget['spent']:.4f}
Monthly projection: ${budget['spent'] * 30:.2f}
Budget remaining today: ${budget['remaining']:.4f}
Budget used: {budget['percent_used']:.1f}%
==============================
"""
    logger.info("daily_cost_report",
                date=budget['date'],
                spent=f"${budget['spent']:.4f}",
                remaining=f"${budget['remaining']:.4f}",
                articles_processed=articles_processed,
                articles_skipped=articles_skipped,
                api_calls=stats.get('api_calls', 0))
    print(report)

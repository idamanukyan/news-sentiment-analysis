"""
Facebook Public Page Scraper for AIIM

Monitors public Facebook pages for Armenian news outlets.
Uses multiple methods with automatic fallback:
1. mbasic.facebook.com scraping (preferred - simple HTML)
2. RSS Bridge (fallback - third-party service)

This is FREE scraping - no paid APIs used.
"""

import re
import random
import time
import structlog
from datetime import datetime, timezone, timedelta
from hashlib import sha256
from typing import List, Dict, Any, Optional

import requests
from bs4 import BeautifulSoup

from ..models import Article, Source
from ..config import get_settings
from ..database import get_db

logger = structlog.get_logger()
settings = get_settings()

# User agents for rotation to avoid blocking
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]

# RSS Bridge instances (free, public)
RSS_BRIDGE_URLS = [
    "https://rss-bridge.org/bridge01",
    "https://wtf.roflcopter.fr/rss-bridge",
]

# Rate limiting
RATE_LIMIT_DELAY = 5  # seconds between requests


class FacebookScraper:
    """Scrapes public Facebook pages for posts."""

    def __init__(self):
        self.session = requests.Session()
        self.rate_limit_delay = RATE_LIMIT_DELAY
        self.successful_methods = {}  # Track which method works for each page

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with rotating user agent."""
        return {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,hy;q=0.8,ru;q=0.7",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

    def scrape_page(self, page_name: str, source_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Try multiple methods to get posts from a Facebook page.

        Args:
            page_name: Facebook page name/username
            source_id: Optional source ID from database

        Returns:
            List of post dictionaries
        """
        # Clean page name
        page_name = self._clean_page_name(page_name)
        if not page_name:
            return []

        # Check if we have a known working method for this page
        preferred_method = self.successful_methods.get(page_name)

        if preferred_method == "mbasic":
            posts = self._scrape_mbasic(page_name, source_id)
            if posts:
                return posts

        if preferred_method == "rss_bridge":
            posts = self._scrape_rss_bridge(page_name, source_id)
            if posts:
                return posts

        # Try all methods in order
        # Method 1: Try mbasic.facebook.com
        posts = self._scrape_mbasic(page_name, source_id)
        if posts:
            logger.info("facebook_scrape_success", page=page_name, method="mbasic", count=len(posts))
            self.successful_methods[page_name] = "mbasic"
            return posts

        # Method 2: Try RSS Bridge
        posts = self._scrape_rss_bridge(page_name, source_id)
        if posts:
            logger.info("facebook_scrape_success", page=page_name, method="rss_bridge", count=len(posts))
            self.successful_methods[page_name] = "rss_bridge"
            return posts

        logger.warning("facebook_all_methods_failed", page=page_name)
        return []

    def _clean_page_name(self, page_name: str) -> Optional[str]:
        """Extract clean page name from URL or name."""
        if not page_name:
            return None

        # Handle full URLs
        if "facebook.com" in page_name:
            match = re.search(r'facebook\.com/([^/?#]+)', page_name)
            if match:
                page_name = match.group(1)

        # Remove @ prefix if present
        page_name = page_name.lstrip('@').strip('/')

        # Skip profile.php URLs (these are user profiles, not pages)
        if page_name.startswith('profile.php'):
            return None

        return page_name if page_name else None

    def _scrape_mbasic(self, page_name: str, source_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Scrape from mbasic.facebook.com (mobile basic version).

        This site uses simple HTML without JavaScript, making it easier to parse.
        """
        try:
            url = f"https://mbasic.facebook.com/{page_name}"
            response = self.session.get(
                url,
                headers=self._get_headers(),
                timeout=20,
                allow_redirects=True
            )

            if response.status_code != 200:
                logger.debug("mbasic_http_error", page=page_name, status=response.status_code)
                return []

            # Check if we got redirected to login
            if "login" in response.url.lower() or "/login" in response.text.lower()[:1000]:
                logger.debug("mbasic_requires_login", page=page_name)
                return []

            soup = BeautifulSoup(response.text, 'html.parser')
            posts = []

            # mbasic uses various structures - try multiple selectors
            # Look for article containers or story divs
            post_containers = []

            # Try finding posts by common patterns
            # Pattern 1: divs with role="article"
            post_containers.extend(soup.find_all('div', {'role': 'article'}))

            # Pattern 2: divs within the main content area
            main_content = soup.find('div', {'id': 'recent'}) or soup.find('div', {'id': 'pages_mbasic_context_items_id'})
            if main_content:
                # Find divs that look like posts (have story-like structure)
                for div in main_content.find_all('div', recursive=False):
                    if div.get_text(strip=True) and len(div.get_text(strip=True)) > 20:
                        post_containers.append(div)

            # Pattern 3: Find by common Facebook post structure
            if not post_containers:
                # Look for divs containing post-like content
                for div in soup.find_all('div'):
                    # Posts typically have text content and some metadata
                    text = div.get_text(strip=True)
                    if len(text) > 50 and len(text) < 10000:
                        # Check for post indicators
                        if div.find('abbr') or div.find('a', href=lambda x: x and '/story.php' in str(x)):
                            post_containers.append(div)

            # Deduplicate by content
            seen_content = set()
            for container in post_containers[:30]:  # Limit to 30 posts
                post = self._parse_mbasic_post(container, page_name, source_id)
                if post and post.get('content'):
                    content_hash = sha256(post['content'].encode()).hexdigest()[:16]
                    if content_hash not in seen_content:
                        seen_content.add(content_hash)
                        posts.append(post)

            time.sleep(self.rate_limit_delay)
            return posts

        except requests.RequestException as e:
            logger.debug("mbasic_request_error", page=page_name, error=str(e))
            return []
        except Exception as e:
            logger.error("mbasic_parse_error", page=page_name, error=str(e))
            return []

    def _parse_mbasic_post(self, container, page_name: str, source_id: Optional[int]) -> Optional[Dict[str, Any]]:
        """Parse a single post from mbasic HTML container."""
        try:
            # Make a copy to avoid modifying original
            div = BeautifulSoup(str(container), 'html.parser')

            # Remove unwanted elements (forms, footers, buttons)
            for unwanted in div.find_all(['footer', 'form', 'button']):
                unwanted.decompose()

            # Remove "Like", "Comment", "Share" text
            for link in div.find_all('a'):
                link_text = link.get_text(strip=True).lower()
                if link_text in ['like', 'comment', 'share', 'reply', 'more', 'see more']:
                    link.decompose()

            # Extract main text content
            content = div.get_text(separator=' ', strip=True)

            # Clean up content
            content = re.sub(r'\s+', ' ', content).strip()

            # Skip if too short or looks like navigation
            if not content or len(content) < 20:
                return None

            # Skip if it's just metadata
            skip_patterns = [
                r'^(\d+\s*(K|M)?\s*(likes?|comments?|shares?)\s*)+$',
                r'^(Like|Comment|Share|Reply|More)(\s|$)',
                r'^See Translation$',
            ]
            for pattern in skip_patterns:
                if re.match(pattern, content, re.I):
                    return None

            # Try to find timestamp
            published_at = None
            time_tag = div.find('abbr')
            if time_tag:
                # mbasic uses various time formats
                time_data = time_tag.get('data-utime')
                if time_data:
                    try:
                        published_at = datetime.fromtimestamp(int(time_data), tz=timezone.utc)
                    except (ValueError, TypeError):
                        pass

            # Try to find post URL
            post_url = None
            permalink = div.find('a', href=lambda x: x and ('/story.php' in str(x) or '/posts/' in str(x)))
            if permalink:
                href = permalink.get('href', '')
                if href.startswith('/'):
                    post_url = f"https://www.facebook.com{href}"
                else:
                    post_url = href

            # Extract engagement counts (approximate from text)
            reaction_count = self._extract_count(str(container), ['like', 'reaction', 'love', 'haha', 'wow', 'sad', 'angry'])
            comment_count = self._extract_count(str(container), ['comment'])
            share_count = self._extract_count(str(container), ['share'])

            # Determine post type
            post_type = 'text'
            if div.find('img'):
                post_type = 'photo'
            if div.find('video') or 'video' in str(container).lower():
                post_type = 'video'

            return {
                'page_name': page_name,
                'source_id': source_id,
                'content': content[:5000],  # Limit content length
                'post_url': post_url,
                'published_at': published_at,
                'reaction_count': reaction_count,
                'comment_count': comment_count,
                'share_count': share_count,
                'post_type': post_type,
            }

        except Exception as e:
            logger.debug("mbasic_post_parse_error", error=str(e))
            return None

    def _extract_count(self, text: str, keywords: List[str]) -> int:
        """Try to extract engagement count from text near keywords."""
        try:
            text_lower = text.lower()
            for kw in keywords:
                # Patterns like "23 likes", "1.2K comments", "Like · 23"
                patterns = [
                    rf'(\d+(?:\.\d+)?)\s*([KMkm])?\s*{kw}',
                    rf'{kw}\s*[·:]\s*(\d+(?:\.\d+)?)\s*([KMkm])?',
                ]
                for pattern in patterns:
                    match = re.search(pattern, text_lower)
                    if match:
                        num_str = match.group(1)
                        multiplier = match.group(2) if len(match.groups()) > 1 else None

                        num = float(num_str)
                        if multiplier and multiplier.upper() == 'K':
                            num *= 1000
                        elif multiplier and multiplier.upper() == 'M':
                            num *= 1000000

                        return int(num)
        except Exception:
            pass
        return 0

    def _scrape_rss_bridge(self, page_name: str, source_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Try getting posts via RSS Bridge instances."""
        for bridge_url in RSS_BRIDGE_URLS:
            try:
                # Try JSON format first
                url = f"{bridge_url}/?action=display&bridge=FacebookBridge&u={page_name}&format=Json"
                response = self.session.get(url, headers=self._get_headers(), timeout=30)

                if response.status_code == 200:
                    try:
                        data = response.json()
                        posts = []

                        for item in data.get('items', [])[:20]:
                            # Parse date
                            published_at = None
                            date_str = item.get('date_published') or item.get('date_modified')
                            if date_str:
                                try:
                                    published_at = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                                except (ValueError, TypeError):
                                    pass

                            content = item.get('content_text') or item.get('content_html', '')
                            if item.get('content_html'):
                                # Strip HTML
                                soup = BeautifulSoup(content, 'html.parser')
                                content = soup.get_text(separator=' ', strip=True)

                            if not content:
                                content = item.get('title', '')

                            # Skip RSS Bridge error messages
                            if content and not content.startswith('Details Type: Exception'):
                                posts.append({
                                    'page_name': page_name,
                                    'source_id': source_id,
                                    'content': content[:5000],
                                    'post_url': item.get('url', ''),
                                    'published_at': published_at,
                                    'reaction_count': 0,
                                    'comment_count': 0,
                                    'share_count': 0,
                                    'post_type': 'text',
                                })

                        if posts:
                            time.sleep(self.rate_limit_delay)
                            return posts

                    except (ValueError, KeyError) as e:
                        logger.debug("rss_bridge_json_error", bridge=bridge_url, error=str(e))
                        continue

            except requests.RequestException as e:
                logger.debug("rss_bridge_request_error", bridge=bridge_url, error=str(e))
                continue

        return []


def convert_facebook_to_article(fb_post: Dict[str, Any]) -> Article:
    """
    Convert a Facebook post to our Article model.

    Args:
        fb_post: Facebook post dictionary

    Returns:
        Article model instance
    """
    content = fb_post.get("content", "")

    # Extract title from first line or truncate
    lines = content.split('\n')
    title = lines[0][:200] if lines else "Facebook Post"

    # If title is too short, use more of the content
    if len(title) < 20 and len(content) > 20:
        title = content[:200]

    # Content hash for deduplication
    content_hash = sha256(content.encode()).hexdigest() if content else None

    # Build external ID
    page_name = fb_post.get('page_name', 'unknown')
    post_url = fb_post.get('post_url', '')

    # Try to extract post ID from URL
    post_id_match = re.search(r'/posts/(\d+)|story_fbid=(\d+)|/(\d+)/?$', post_url or '')
    if post_id_match:
        post_id = post_id_match.group(1) or post_id_match.group(2) or post_id_match.group(3)
        external_id = f"fb_{page_name}_{post_id}"
    else:
        # Use content hash as fallback ID
        external_id = f"fb_{page_name}_{content_hash[:16]}" if content_hash else f"fb_{page_name}_{datetime.now().timestamp()}"

    # Calculate total engagement
    engagement_count = (
        fb_post.get('reaction_count', 0) +
        fb_post.get('comment_count', 0) +
        fb_post.get('share_count', 0)
    )

    # Metadata
    metadata = {
        "page_name": page_name,
        "post_type": fb_post.get('post_type', 'text'),
        "reaction_count": fb_post.get('reaction_count', 0),
        "comment_count": fb_post.get('comment_count', 0),
        "share_count": fb_post.get('share_count', 0),
    }

    return Article(
        source_id=fb_post.get('source_id'),
        external_id=external_id,
        title=title,
        content=content,
        url=post_url,
        author=page_name,
        published_at=fb_post.get('published_at'),
        content_hash=content_hash,
        extra_data=metadata,
        source_type="FACEBOOK",
        platform="facebook",
        engagement_count=engagement_count,
        language="hy",  # Default to Armenian, will be detected by analyzer
    )


def fetch_all_facebook_sources() -> int:
    """
    Main entry point for scheduler - fetches from all Facebook sources.

    Returns:
        Number of saved posts
    """
    scraper = FacebookScraper()
    total_saved = 0
    sources_processed = 0
    sources_failed = 0

    try:
        with get_db() as db:
            # Get active Facebook sources
            sources = db.query(Source).filter(
                Source.active == True,
                Source.type == "FACEBOOK"
            ).all()

            logger.info("facebook_fetch_starting", source_count=len(sources))

            for source in sources:
                try:
                    # Extract page name from URL
                    page_name = None
                    if source.url:
                        match = re.search(r'facebook\.com/([^/?#]+)', source.url)
                        if match:
                            page_name = match.group(1)

                    if not page_name:
                        logger.warning("facebook_invalid_url", source_id=source.id, url=source.url)
                        sources_failed += 1
                        continue

                    # Fetch posts
                    posts = scraper.scrape_page(page_name, source_id=source.id)

                    if not posts:
                        logger.debug("facebook_no_posts", page=page_name)
                        sources_failed += 1
                        continue

                    # Convert to articles and save
                    saved_count = 0
                    for post in posts:
                        article = convert_facebook_to_article(post)

                        # Check for duplicates by external_id
                        existing = db.query(Article).filter(
                            Article.external_id == article.external_id
                        ).first()

                        if not existing:
                            # Also check by content hash
                            if article.content_hash:
                                existing = db.query(Article).filter(
                                    Article.content_hash == article.content_hash,
                                    Article.source_id == source.id
                                ).first()

                        if not existing:
                            db.add(article)
                            saved_count += 1

                    # Update source timestamps
                    source.last_fetched = datetime.now(timezone.utc)
                    if saved_count > 0:
                        source.last_success = datetime.now(timezone.utc)

                    db.commit()
                    total_saved += saved_count
                    sources_processed += 1

                    logger.info(
                        "facebook_source_complete",
                        page=page_name,
                        fetched=len(posts),
                        saved=saved_count
                    )

                    # Rate limit between sources
                    time.sleep(RATE_LIMIT_DELAY)

                except Exception as e:
                    logger.error("facebook_source_error", source_id=source.id, error=str(e))
                    sources_failed += 1
                    continue

    except Exception as e:
        logger.error("facebook_fetch_error", error=str(e))

    logger.info(
        "facebook_fetch_complete",
        sources_processed=sources_processed,
        sources_failed=sources_failed,
        total_saved=total_saved
    )

    return total_saved

"""
Facebook Public Page Scraper for AIIM

Monitors public Facebook pages for Armenian news outlets.
Uses multiple methods with automatic fallback:
1. Authenticated scraping with cookies (preferred - full access)
2. mbasic.facebook.com scraping (fallback - simple HTML)
3. RSS Bridge (last resort - third-party service)

Supports session cookies for authenticated access.
"""

import re
import random
import time
import json
import structlog
from datetime import datetime, timezone, timedelta
from hashlib import sha256
from typing import List, Dict, Any, Optional

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

from ..models import Article, Source
from ..config import get_settings
from ..database import get_db

logger = structlog.get_logger()
settings = get_settings()

def parse_cookie_string(cookie_string: str) -> Dict[str, str]:
    """Parse cookie string into dictionary.

    Supports formats:
    - JSON object: {"c_user": "123", "xs": "abc"}
    - JSON array (browser extension export): [{"name": "c_user", "value": "123"}, ...]
    - Browser format: c_user=123; xs=abc; datr=xyz
    """
    if not cookie_string:
        logger.debug("cookie_parse_empty_input")
        return {}

    cookie_string = cookie_string.strip()
    first_char = cookie_string[0] if cookie_string else ''
    logger.info("cookie_parse_attempt",
                length=len(cookie_string),
                first_char=first_char,
                first_50=cookie_string[:50])

    # Try JSON format first
    if cookie_string.startswith('{'):
        try:
            result = json.loads(cookie_string)
            logger.info("cookie_parse_json_object", count=len(result))
            return result
        except json.JSONDecodeError as e:
            logger.warning("cookie_parse_json_object_failed", error=str(e))

    # Try JSON array format (from browser cookie exporters)
    if cookie_string.startswith('['):
        try:
            cookie_list = json.loads(cookie_string)
            logger.info("cookie_parse_json_array", items=len(cookie_list))
            cookies = {}
            for cookie in cookie_list:
                if isinstance(cookie, dict) and 'name' in cookie and 'value' in cookie:
                    # Only use facebook.com cookies
                    domain = cookie.get('domain', '')
                    if 'facebook.com' in domain or not domain:
                        cookies[cookie['name']] = cookie['value']
                        logger.debug("cookie_extracted", name=cookie['name'], domain=domain)
            logger.info("cookie_parse_json_array_result", count=len(cookies), keys=list(cookies.keys()))
            return cookies
        except json.JSONDecodeError as e:
            logger.warning("cookie_parse_json_array_failed", error=str(e))

    # Parse browser cookie format
    cookies = {}
    for part in cookie_string.split(';'):
        part = part.strip()
        if '=' in part:
            key, value = part.split('=', 1)
            cookies[key.strip()] = value.strip()

    logger.info("cookie_parse_browser_format", count=len(cookies))
    return cookies

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
        self.cookies = parse_cookie_string(settings.facebook_cookies)
        self.has_cookies = bool(self.cookies)

        # Apply cookies to session if available
        if self.has_cookies:
            for name, value in self.cookies.items():
                self.session.cookies.set(name, value, domain='.facebook.com')
            # Log which essential cookies we have
            essential_cookies = ['c_user', 'xs', 'datr', 'fr', 'sb']
            found_essential = [c for c in essential_cookies if c in self.cookies]
            logger.info("facebook_cookies_loaded",
                       cookie_count=len(self.cookies),
                       essential_cookies=found_essential,
                       has_c_user='c_user' in self.cookies,
                       has_xs='xs' in self.cookies)
        else:
            logger.warning("facebook_cookies_not_configured",
                          env_var_set=bool(settings.facebook_cookies),
                          env_var_length=len(settings.facebook_cookies) if settings.facebook_cookies else 0)

    def _get_headers(self, authenticated: bool = False) -> Dict[str, str]:
        """Get request headers with rotating user agent."""
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,hy;q=0.8,ru;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
        }
        if authenticated:
            headers["Referer"] = "https://www.facebook.com/"
        return headers

    def scrape_page(self, page_name: str, source_id: Optional[int] = None, page_url: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Try multiple methods to get posts from a Facebook page.

        Args:
            page_name: Facebook page name/username
            source_id: Optional source ID from database
            page_url: Optional full URL (for profile.php pages)

        Returns:
            List of post dictionaries
        """
        # Clean page name (but keep original URL for profile.php pages)
        original_url = page_url
        page_name = self._clean_page_name(page_name)

        # For profile.php pages, we need the full URL
        is_profile_page = original_url and 'profile.php' in original_url

        if not page_name and not is_profile_page:
            return []

        # Check if we have a known working method for this page
        cache_key = page_name or original_url
        preferred_method = self.successful_methods.get(cache_key)

        # If we have cookies, try Playwright method first (handles JavaScript rendering)
        if self.has_cookies:
            if preferred_method == "playwright" or not preferred_method:
                posts = self._scrape_playwright(page_name, source_id, original_url)
                if posts:
                    logger.info("facebook_scrape_success", page=page_name or original_url, method="playwright", count=len(posts))
                    self.successful_methods[cache_key] = "playwright"
                    return posts

            # Fallback to simple authenticated request (no JS rendering)
            if preferred_method == "authenticated" or not preferred_method:
                posts = self._scrape_authenticated(page_name, source_id, original_url)
                if posts:
                    logger.info("facebook_scrape_success", page=page_name or original_url, method="authenticated", count=len(posts))
                    self.successful_methods[cache_key] = "authenticated"
                    return posts

        if preferred_method == "mbasic" and page_name:
            posts = self._scrape_mbasic(page_name, source_id)
            if posts:
                return posts

        if preferred_method == "rss_bridge" and page_name:
            posts = self._scrape_rss_bridge(page_name, source_id)
            if posts:
                return posts

        # Try all methods in order
        # Method 1: Try Playwright (JavaScript rendering) if we have cookies
        if self.has_cookies:
            posts = self._scrape_playwright(page_name, source_id, original_url)
            if posts:
                logger.info("facebook_scrape_success", page=page_name or original_url, method="playwright", count=len(posts))
                self.successful_methods[cache_key] = "playwright"
                return posts

        # Method 2: Try mbasic.facebook.com (only for named pages, not profile.php)
        if page_name:
            posts = self._scrape_mbasic(page_name, source_id)
            if posts:
                logger.info("facebook_scrape_success", page=page_name, method="mbasic", count=len(posts))
                self.successful_methods[cache_key] = "mbasic"
                return posts

        # Method 3: Try RSS Bridge
        if page_name:
            posts = self._scrape_rss_bridge(page_name, source_id)
            if posts:
                logger.info("facebook_scrape_success", page=page_name, method="rss_bridge", count=len(posts))
                self.successful_methods[cache_key] = "rss_bridge"
                return posts

        logger.warning("facebook_all_methods_failed", page=page_name or original_url)
        return []

    def _scrape_authenticated(self, page_name: Optional[str], source_id: Optional[int], page_url: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Scrape Facebook page using authenticated session with cookies.

        This method uses the main Facebook site with login cookies.
        """
        if not self.has_cookies:
            return []

        try:
            # Determine URL to scrape
            if page_url and 'profile.php' in page_url:
                url = page_url
            elif page_name:
                url = f"https://www.facebook.com/{page_name}"
            else:
                return []

            logger.debug("facebook_auth_request", url=url)

            response = self.session.get(
                url,
                headers=self._get_headers(authenticated=True),
                timeout=30,
                allow_redirects=True
            )

            if response.status_code != 200:
                logger.debug("facebook_auth_http_error", url=url, status=response.status_code)
                return []

            # Check if we're still logged in (not redirected to login)
            if '/login' in response.url or 'login' in response.text[:2000].lower():
                logger.warning("facebook_cookies_expired")
                self.has_cookies = False
                return []

            soup = BeautifulSoup(response.text, 'html.parser')
            posts = []

            # Facebook's modern HTML structure uses data attributes and specific div patterns
            # Look for post containers - they often have role="article" or specific data attributes
            post_containers = []

            # Pattern 1: role="article" divs (common for posts)
            post_containers.extend(soup.find_all('div', {'role': 'article'}))

            # Pattern 2: Look for divs with data-pagelet containing "FeedUnit"
            for div in soup.find_all('div', attrs={'data-pagelet': True}):
                pagelet = div.get('data-pagelet', '')
                if 'FeedUnit' in pagelet or 'ProfileTimeline' in pagelet:
                    post_containers.append(div)

            # Pattern 3: Look for post-like structures with timestamps
            if not post_containers:
                # Find containers that have links with timestamps
                for container in soup.find_all('div'):
                    # Posts typically have a link with a timestamp
                    time_links = container.find_all('a', href=lambda x: x and ('/posts/' in str(x) or 'story_fbid' in str(x)))
                    if time_links and len(container.get_text(strip=True)) > 50:
                        post_containers.append(container)

            # Process found containers
            seen_content = set()
            for container in post_containers[:20]:  # Limit to 20 posts
                post = self._parse_authenticated_post(container, page_name, source_id)
                if post and post.get('content'):
                    content_hash = sha256(post['content'].encode()).hexdigest()[:16]
                    if content_hash not in seen_content:
                        seen_content.add(content_hash)
                        posts.append(post)

            time.sleep(self.rate_limit_delay)
            return posts

        except requests.RequestException as e:
            logger.debug("facebook_auth_request_error", error=str(e))
            return []
        except Exception as e:
            logger.error("facebook_auth_parse_error", error=str(e))
            return []

    def _scrape_playwright(self, page_name: Optional[str], source_id: Optional[int], page_url: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Scrape Facebook page using Playwright for JavaScript rendering.

        This method uses a headless browser to render the page and extract posts.
        """
        if not self.has_cookies:
            return []

        try:
            # Determine URL to scrape
            if page_url and 'profile.php' in page_url:
                url = page_url
            elif page_name:
                url = f"https://www.facebook.com/{page_name}"
            else:
                return []

            logger.debug("facebook_playwright_request", url=url)

            with sync_playwright() as p:
                # Launch browser in headless mode
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent=random.choice(USER_AGENTS),
                    viewport={'width': 1280, 'height': 800}
                )

                # Add cookies
                cookie_list = []
                for name, value in self.cookies.items():
                    cookie_list.append({
                        'name': name,
                        'value': value,
                        'domain': '.facebook.com',
                        'path': '/'
                    })
                context.add_cookies(cookie_list)

                page = context.new_page()

                try:
                    # Navigate to the page - use domcontentloaded for faster initial load
                    page.goto(url, wait_until='domcontentloaded', timeout=60000)

                    # Wait for page to stabilize
                    page.wait_for_timeout(5000)

                    # Scroll down to load more posts
                    for _ in range(2):
                        page.evaluate('window.scrollBy(0, 800)')
                        page.wait_for_timeout(2000)

                    # Check if logged in
                    if '/login' in page.url:
                        logger.warning("facebook_playwright_not_logged_in")
                        browser.close()
                        return []

                    # Get page content
                    html = page.content()

                except PlaywrightTimeout:
                    logger.debug("facebook_playwright_timeout", url=url)
                    browser.close()
                    return []
                except Exception as e:
                    logger.debug("facebook_playwright_page_error", url=url, error=str(e))
                    browser.close()
                    return []

                browser.close()

            # Parse the rendered HTML
            soup = BeautifulSoup(html, 'html.parser')
            posts = []

            # Look for post containers - Facebook uses role="article" for posts
            post_containers = soup.find_all('div', {'role': 'article'})

            # Also look for feed story containers
            if not post_containers:
                for div in soup.find_all('div', attrs={'data-pagelet': True}):
                    pagelet = div.get('data-pagelet', '')
                    if 'FeedUnit' in pagelet or 'ProfileTimeline' in pagelet:
                        post_containers.append(div)

            # Process found containers
            seen_content = set()
            for container in post_containers[:20]:
                post = self._parse_playwright_post(container, page_name, source_id)
                if post and post.get('content'):
                    content_hash = sha256(post['content'].encode()).hexdigest()[:16]
                    if content_hash not in seen_content:
                        seen_content.add(content_hash)
                        posts.append(post)

            logger.debug("facebook_playwright_parsed", url=url, posts=len(posts))
            time.sleep(self.rate_limit_delay)
            return posts

        except Exception as e:
            logger.error("facebook_playwright_error", error=str(e))
            return []

    def _parse_playwright_post(self, container, page_name: Optional[str], source_id: Optional[int]) -> Optional[Dict[str, Any]]:
        """Parse a single post from Playwright-rendered Facebook HTML."""
        try:
            div = BeautifulSoup(str(container), 'html.parser')

            # Remove unwanted elements
            for unwanted in div.find_all(['form', 'button', 'svg']):
                unwanted.decompose()

            content_parts = []

            # Look for post text in various containers
            # Pattern 1: data-ad-preview="message"
            message_div = div.find('div', {'data-ad-preview': 'message'})
            if message_div:
                content_parts.append(message_div.get_text(separator=' ', strip=True))

            # Pattern 2: dir="auto" divs with substantial text
            for text_div in div.find_all('div', {'dir': 'auto'}):
                text = text_div.get_text(strip=True)
                if text and len(text) > 30:
                    # Skip UI elements
                    skip_words = ['like', 'comment', 'share', 'see more', 'see less',
                                  'reply', 'write a comment', 'most relevant']
                    if not any(skip in text.lower() for skip in skip_words):
                        if text not in content_parts:
                            content_parts.append(text)

            # Pattern 3: span elements with text (Facebook often uses spans)
            if not content_parts:
                for span in div.find_all('span', {'dir': 'auto'}):
                    text = span.get_text(strip=True)
                    if text and len(text) > 30:
                        content_parts.append(text)

            content = ' '.join(content_parts)
            content = re.sub(r'\s+', ' ', content).strip()

            if not content or len(content) < 30:
                return None

            # Skip UI-only content
            skip_patterns = [
                r'^(Like|Comment|Share|Reply|See more|See less)',
                r'^\d+\s*(comments?|shares?|likes?)\s*$',
            ]
            for pattern in skip_patterns:
                if re.match(pattern, content, re.I):
                    return None

            # Try to find post URL
            post_url = None
            for link in div.find_all('a', href=True):
                href = link.get('href', '')
                if '/posts/' in href or 'story_fbid' in href:
                    if href.startswith('/'):
                        post_url = f"https://www.facebook.com{href}"
                    else:
                        post_url = href
                    break

            # Generate external ID
            if post_url:
                external_id = f"fb_{sha256(post_url.encode()).hexdigest()[:16]}"
            else:
                external_id = f"fb_{sha256(content[:100].encode()).hexdigest()[:16]}"

            return {
                'source_id': source_id,
                'external_id': external_id,
                'content': content[:5000],
                'url': post_url,
                'author': page_name,
                'published_at': datetime.now(timezone.utc),
            }

        except Exception as e:
            logger.debug("facebook_playwright_parse_error", error=str(e))
            return None

    def _parse_authenticated_post(self, container, page_name: Optional[str], source_id: Optional[int]) -> Optional[Dict[str, Any]]:
        """Parse a single post from authenticated Facebook HTML."""
        try:
            # Make a copy
            div = BeautifulSoup(str(container), 'html.parser')

            # Remove comment sections, like buttons, share buttons
            for unwanted in div.find_all(['form', 'button']):
                unwanted.decompose()

            # Try to find the main post text - usually in specific containers
            content_parts = []

            # Look for data-ad-preview="message" or similar markers
            message_div = div.find('div', {'data-ad-preview': 'message'})
            if message_div:
                content_parts.append(message_div.get_text(separator=' ', strip=True))

            # Look for dir="auto" divs which often contain post text
            for text_div in div.find_all('div', {'dir': 'auto'}):
                text = text_div.get_text(strip=True)
                if text and len(text) > 20 and text not in content_parts:
                    # Skip common UI text
                    if not any(skip in text.lower() for skip in ['like', 'comment', 'share', 'see more', 'see less']):
                        content_parts.append(text)

            # Fallback: get all text
            if not content_parts:
                content = div.get_text(separator=' ', strip=True)
                content = re.sub(r'\s+', ' ', content).strip()
                if len(content) > 30:
                    content_parts = [content[:3000]]

            content = ' '.join(content_parts)
            content = re.sub(r'\s+', ' ', content).strip()

            if not content or len(content) < 20:
                return None

            # Skip UI-only content
            skip_patterns = [
                r'^(Like|Comment|Share|Reply|See more|See less|Write a comment)',
                r'^\d+\s*(comments?|shares?|likes?)\s*$',
            ]
            for pattern in skip_patterns:
                if re.match(pattern, content, re.I):
                    return None

            # Try to find post URL
            post_url = None
            for link in div.find_all('a', href=True):
                href = link.get('href', '')
                if '/posts/' in href or 'story_fbid' in href:
                    if href.startswith('/'):
                        post_url = f"https://www.facebook.com{href}"
                    else:
                        post_url = href
                    break

            # Try to find timestamp
            published_at = None
            # Modern FB uses various time representations
            time_elements = div.find_all(['abbr', 'span', 'a'], attrs={'data-utime': True})
            for elem in time_elements:
                try:
                    utime = elem.get('data-utime')
                    if utime:
                        published_at = datetime.fromtimestamp(int(utime), tz=timezone.utc)
                        break
                except (ValueError, TypeError):
                    continue

            # If no timestamp found, use current time
            if not published_at:
                published_at = datetime.now(timezone.utc)

            return {
                'page_name': page_name or 'unknown',
                'source_id': source_id,
                'content': content[:5000],
                'post_url': post_url,
                'published_at': published_at,
                'reaction_count': 0,
                'comment_count': 0,
                'share_count': 0,
                'post_type': 'text',
            }

        except Exception as e:
            logger.debug("facebook_auth_post_parse_error", error=str(e))
            return None

    def _clean_page_name(self, page_name: str) -> Optional[str]:
        """Extract clean page name from URL or name."""
        if not page_name:
            return None

        # Handle full URLs
        if "facebook.com" in page_name:
            # Check for profile.php URLs - these need special handling
            if 'profile.php' in page_name:
                # Return None here, but the URL will be used directly
                return None

            match = re.search(r'facebook\.com/([^/?#]+)', page_name)
            if match:
                page_name = match.group(1)

        # Remove @ prefix if present
        page_name = page_name.lstrip('@').strip('/')

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
                    page_url = source.url

                    if source.url:
                        # Check for profile.php URLs
                        if 'profile.php' in source.url:
                            page_name = None  # Will use full URL
                        else:
                            match = re.search(r'facebook\.com/([^/?#]+)', source.url)
                            if match:
                                page_name = match.group(1)

                    if not page_name and 'profile.php' not in (source.url or ''):
                        logger.warning("facebook_invalid_url", source_id=source.id, url=source.url)
                        sources_failed += 1
                        continue

                    # Fetch posts (pass full URL for profile.php pages)
                    posts = scraper.scrape_page(page_name, source_id=source.id, page_url=page_url)

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

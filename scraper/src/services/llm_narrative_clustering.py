"""
LLM-Based Narrative Clustering for AIIM

Replaces broken TF-IDF clustering with a 3-step hybrid approach:
1. LLM Topic Classification - Claude classifies each article by topic
2. Sub-clustering - Groups articles within topics by keyword overlap or LLM
3. Narrative Creation - Saves clusters as narratives with proper metadata

For best results, articles should be translated to English first using the
combined analyzer (sentiment/analyzer.py). This ensures:
- Keywords are in English for reliable cross-article matching
- Subtopics are in English for LLM clustering
- Title/content translations are available for display
"""

import json
import re
import time
import structlog
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

from sqlalchemy import text

from ..config import get_settings
from ..database import get_db
from ..budget_tracker import can_spend, add_spend
from ..llm_client import create_message

logger = structlog.get_logger()
settings = get_settings()

# Valid topics for classification
VALID_TOPICS = [
    "Elections", "Foreign Policy", "Economy", "Security", "Corruption",
    "Human Rights", "Media", "Infrastructure", "EU Relations", "Russia Relations",
    "Armenia-Azerbaijan", "Diaspora", "Judiciary", "Health", "Education",
    "Environment", "Culture", "Sports", "Other"
]


def clean_text(text: str) -> str:
    """Clean text for processing."""
    if not text:
        return ""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Remove HTML entities
    text = re.sub(r'&[a-zA-Z]+;', ' ', text)
    # Remove URLs
    text = re.sub(r'https?://\S+', ' ', text)
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


class LLMNarrativeClustering:
    """
    LLM-based narrative clustering that works correctly for Armenian text.
    """

    def __init__(self):
        # Using Haiku for cost optimization (~10x cheaper than Sonnet, sufficient for translation/sentiment/clustering)
        self.model = "claude-haiku-4-5-20251001"
        self.batch_size = 10
        self.api_delay = 1.0  # seconds between API calls
        self.max_retries = 3

    # =========================================================================
    # STEP 1: LLM TOPIC CLASSIFICATION
    # =========================================================================

    def classify_article_rule_based(self, title: str, content: str) -> Dict[str, Any]:
        """
        Rule-based classification fallback when LLM API is unavailable.
        Uses keyword matching for Armenian/Russian/English text.
        """
        text = f"{title} {content}".lower()

        # Topic keywords (includes Armenian and Russian transliterations)
        topic_patterns = {
            "Elections": ["ընdelays", "քdelays", " delays", "election", "vote", "ballot", "campaign", "выборы", "голосование", "кандидат"],
            "Armenia-Azerbaijan": ["ադdelays", "арцах", "карабах", "азербайджан", "aliyev", "karabakh", "lachin", "corridor", "ceasefire", "armenian-azerbaijani"],
            "Foreign Policy": ["diplomat", "embassy", "foreign", "minister", "bilateral", "treaty", "МИД", "дипломат", "арят", "посольств"],
            "Russia Relations": ["russia", "putin", "moscow", "kremlin", "ռdelays", "russian", "россия", "путин", "москва", "кремль"],
            "EU Relations": ["europe", "brussels", "eu", "european union", "visa", "schengen", "евросоюз", "брюссель", "европейский"],
            "Economy": ["econom", "inflation", "gdp", "export", "import", "price", "market", "dram", "bank", "экономик", "инфляция", "рынок"],
            "Security": ["military", "army", "defense", "weapon", "soldier", "border", "армия", "военн", "оборон", "граница", "безопасность"],
            "Corruption": ["corruption", "bribe", "embezzl", "fraud", "laundering", "коррупц", "взятк", "хищение"],
            "Judiciary": ["court", "judge", "trial", "verdict", "prosecutor", "justice", "суд", "судья", "приговор", "прокурор"],
            "Health": ["health", "hospital", "doctor", "medicine", "covid", "pandemic", "здоров", "больниц", "врач", "медицин"],
            "Education": ["school", "university", "student", "education", "teacher", "школ", "университет", "студент", "образован"],
            "Infrastructure": ["road", "highway", "bridge", "airport", "construction", "дорог", "мост", "строительств", "инфраструктур"],
            "Human Rights": ["human rights", "protest", "freedom", "democracy", "activist", "права человека", "протест", "свобод", "демократ"],
            "Media": ["media", "journalist", "press", "news", "tv", "СМИ", "журналист", "пресс"],
            "Diaspora": ["diaspora", "armenian community", "abroad", "диаспор", "сообщество"],
            "Environment": ["environment", "climate", "pollution", "ecology", "экологи", "климат", "загрязн"],
            "Culture": ["culture", "museum", "festival", "heritage", "art", "культур", "музей", "фестиваль", "искусств"],
            "Sports": ["sport", "football", "team", "championship", "athlete", "спорт", "футбол", "чемпионат"],
        }

        # Score each topic
        topic_scores = {}
        for topic, keywords in topic_patterns.items():
            score = sum(1 for kw in keywords if kw in text)
            if score > 0:
                topic_scores[topic] = score

        # Get best matching topic
        if topic_scores:
            best_topic = max(topic_scores, key=topic_scores.get)
        else:
            best_topic = "Other"

        # Extract simple keywords (proper nouns, capitalized words)
        words = re.findall(r'\b[A-Z][a-z]{2,}\b', f"{title} {content}")
        keywords = list(set(words))[:5]

        # Create subtopic from first few words of title
        clean_title = clean_text(title)
        subtopic = " ".join(clean_title.split()[:5]) if clean_title else best_topic

        return {
            "topic": best_topic,
            "keywords": keywords if keywords else [best_topic],
            "subtopic": subtopic
        }

    def classify_article(self, title: str, content: str) -> Dict[str, Any]:
        """
        Classify a single article using Claude with rule-based fallback.

        Returns: {"topic": str, "keywords": list, "subtopic": str}
        """
        # Prepare content snippet
        clean_title = clean_text(title)
        clean_content = clean_text(content)[:500] if content else ""

        system_prompt = "You are classifying Armenian news articles by topic. Respond with ONLY a JSON object, no other text."

        user_prompt = f"""Classify this news article into exactly one primary topic and extract keywords.

Title: {clean_title}
Content: {clean_content}

Respond with ONLY this JSON format:
{{"topic": "<one of: Elections, Foreign Policy, Economy, Security, Corruption, Human Rights, Media, Infrastructure, EU Relations, Russia Relations, Armenia-Azerbaijan, Diaspora, Judiciary, Health, Education, Environment, Culture, Sports, Other>",
"keywords": ["<3-5 specific English keywords: names, places, policies, events — NOT generic verbs>"],
"subtopic": "<brief 3-5 word English description of the specific story>"}}"""

        for attempt in range(self.max_retries):
            try:
                # Budget check before API call
                if not can_spend():
                    logger.warning("budget_exhausted_using_fallback")
                    return self.classify_article_rule_based(title, content)

                response = create_message(
                    model=self.model,
                    max_tokens=200,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}],
                    trace_name="classify_article",
                    trace_metadata={"task": "topic_classification"}
                )

                # Track spending
                add_spend(response.usage.input_tokens, response.usage.output_tokens)

                response_text = response.content[0].text.strip()

                # Parse JSON response
                # Handle potential markdown code blocks
                if response_text.startswith("```"):
                    response_text = re.sub(r'^```json?\s*', '', response_text)
                    response_text = re.sub(r'\s*```$', '', response_text)

                result = json.loads(response_text)

                # Validate topic
                if result.get("topic") not in VALID_TOPICS:
                    result["topic"] = "Other"

                # Ensure keywords is a list
                if not isinstance(result.get("keywords"), list):
                    result["keywords"] = []

                # Ensure subtopic exists
                if not result.get("subtopic"):
                    result["subtopic"] = result.get("topic", "Unclassified")

                return result

            except json.JSONDecodeError as e:
                logger.warning("json_parse_error", attempt=attempt, error=str(e), response=response_text[:200])
                if attempt == self.max_retries - 1:
                    # Fallback to rule-based
                    logger.info("falling_back_to_rule_based", reason="json_parse_error")
                    return self.classify_article_rule_based(title, content)

            except Exception as e:
                error_str = str(e)
                # Check for credit/billing errors
                if "credit" in error_str.lower() or "billing" in error_str.lower() or "400" in error_str:
                    logger.warning("api_credits_exhausted", using_fallback=True)
                    return self.classify_article_rule_based(title, content)

                logger.warning("classification_error", attempt=attempt, error=error_str)
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    # Fallback to rule-based
                    logger.info("falling_back_to_rule_based", reason="api_error")
                    return self.classify_article_rule_based(title, content)

        return self.classify_article_rule_based(title, content)

    def classify_unclassified_articles(self, limit: int = 500) -> Dict[str, int]:
        """
        Classify articles that haven't been classified yet.

        NOTE: Articles processed by the combined analyzer (sentiment/analyzer.py)
        already have llm_topic set. This function is for:
        - Legacy articles that only have sentiment but no classification
        - Fallback if combined analysis is not run

        Returns: {"total": N, "classified": M, "by_topic": {...}}
        """
        logger.info("starting_article_classification", limit=limit)

        with get_db() as db:
            # Fetch unclassified articles
            # Skip articles that have translation (already processed by combined analysis)
            result = db.execute(text("""
                SELECT id, title, content, title_en, content_en
                FROM articles
                WHERE llm_topic IS NULL
                AND title IS NOT NULL
                AND LENGTH(title) > 10
                ORDER BY published_at DESC
                LIMIT :limit
            """), {"limit": limit})

            articles = [{
                "id": row.id,
                "title": row.title_en or row.title,  # Prefer English
                "content": row.content_en or row.content  # Prefer English
            } for row in result]

        if not articles:
            logger.info("no_unclassified_articles_found")
            return {"total": 0, "classified": 0, "by_topic": {}}

        logger.info("found_unclassified_articles", count=len(articles))

        # Process in batches
        classified_count = 0
        topic_counts = defaultdict(int)

        for i in range(0, len(articles), self.batch_size):
            batch = articles[i:i + self.batch_size]

            for article in batch:
                # Classify article
                classification = self.classify_article(article["title"], article["content"])

                # Save to database
                with get_db() as db:
                    db.execute(text("""
                        UPDATE articles SET
                            llm_topic = :topic,
                            llm_keywords = :keywords,
                            llm_subtopic = :subtopic,
                            llm_classified_at = NOW()
                        WHERE id = :id
                    """), {
                        "id": article["id"],
                        "topic": classification["topic"],
                        "keywords": classification["keywords"],
                        "subtopic": classification["subtopic"],
                    })
                    db.commit()

                classified_count += 1
                topic_counts[classification["topic"]] += 1

                # Rate limiting
                time.sleep(self.api_delay)

            # Progress log
            logger.info("classification_progress",
                       classified=classified_count,
                       total=len(articles),
                       percent=f"{(classified_count/len(articles))*100:.1f}%")

        logger.info("classification_complete",
                   total=len(articles),
                   classified=classified_count,
                   by_topic=dict(topic_counts))

        return {
            "total": len(articles),
            "classified": classified_count,
            "by_topic": dict(topic_counts)
        }

    # =========================================================================
    # STEP 2: BUILD NARRATIVE CLUSTERS FROM TOPICS
    # =========================================================================

    def get_topic_groups(self, days: int = 7) -> Dict[str, List[Dict[str, Any]]]:
        """
        Group classified articles by topic.

        Uses English translations (title_en, content_en) when available
        for better cross-article matching. Falls back to original text.

        Returns: {"Elections": [articles...], "Economy": [articles...], ...}
        """
        since = datetime.utcnow() - timedelta(days=days)

        with get_db() as db:
            result = db.execute(text("""
                SELECT
                    a.id,
                    a.title,
                    a.content,
                    a.title_en,
                    a.content_en,
                    a.detected_language,
                    a.llm_topic,
                    a.llm_keywords,
                    a.llm_subtopic,
                    a.published_at,
                    a.source_id,
                    s.name as source_name,
                    s.type as source_type,
                    sr.sentiment,
                    sr.confidence as sentiment_confidence
                FROM articles a
                LEFT JOIN sources s ON a.source_id = s.id
                LEFT JOIN sentiment_results sr ON a.id = sr.article_id
                WHERE a.llm_topic IS NOT NULL
                AND a.llm_topic != 'Unclassified'
                AND a.published_at >= :since
                ORDER BY a.llm_topic, a.published_at DESC
            """), {"since": since})

            topic_groups = defaultdict(list)
            for row in result:
                # Prefer English text for clustering, fall back to original
                title = row.title_en or row.title
                content = row.content_en or row.content
                content_snippet = content[:500] if content else ""

                article = {
                    "id": row.id,
                    "title": title,
                    "title_original": row.title,
                    "content": content_snippet,
                    "detected_language": row.detected_language or "hy",
                    "topic": row.llm_topic,
                    "keywords": row.llm_keywords or [],
                    "subtopic": row.llm_subtopic or "",
                    "published_at": row.published_at,
                    "source_id": row.source_id,
                    "source_name": row.source_name,
                    "source_type": row.source_type,
                    "sentiment": row.sentiment,
                    "sentiment_confidence": float(row.sentiment_confidence) if row.sentiment_confidence else None,
                }
                topic_groups[row.llm_topic].append(article)

        # Log language distribution
        all_articles = [a for articles in topic_groups.values() for a in articles]
        lang_counts = defaultdict(int)
        for a in all_articles:
            lang_counts[a.get("detected_language", "unknown")] += 1

        logger.info("topic_groups_loaded",
                   topics=len(topic_groups),
                   total_articles=len(all_articles),
                   language_distribution=dict(lang_counts))

        return dict(topic_groups)

    def cluster_by_keyword_overlap(self, articles: List[Dict[str, Any]],
                                    min_overlap: int = 2,
                                    min_cluster_size: int = 3) -> List[List[Dict[str, Any]]]:
        """
        Cluster articles by keyword overlap within a topic.

        Two articles are in the same cluster if they share at least min_overlap keywords.
        Uses union-find algorithm for efficient clustering.
        """
        if len(articles) < min_cluster_size:
            return []

        # Build adjacency based on keyword overlap
        n = len(articles)
        parent = list(range(n))

        def find(x):
            if parent[x] != x:
                parent[x] = find(parent[x])
            return parent[x]

        def union(x, y):
            px, py = find(x), find(y)
            if px != py:
                parent[px] = py

        # Connect articles with sufficient keyword overlap
        for i in range(n):
            keywords_i = set(k.lower() for k in articles[i].get("keywords", []))
            for j in range(i + 1, n):
                keywords_j = set(k.lower() for k in articles[j].get("keywords", []))
                overlap = len(keywords_i & keywords_j)
                if overlap >= min_overlap:
                    union(i, j)

        # Group articles by cluster
        clusters = defaultdict(list)
        for i in range(n):
            clusters[find(i)].append(articles[i])

        # Filter to valid clusters
        valid_clusters = [
            cluster for cluster in clusters.values()
            if len(cluster) >= min_cluster_size
        ]

        return valid_clusters

    def cluster_by_llm_subtopic(self, topic: str, articles: List[Dict[str, Any]],
                                 min_cluster_size: int = 3) -> List[Dict[str, Any]]:
        """
        Use Claude to group articles by subtopic similarity.
        Falls back to keyword clustering if API unavailable.

        Returns list of cluster definitions with article indices.
        """
        if len(articles) < min_cluster_size:
            return []

        # Try LLM clustering first
        try:
            # Prepare subtopics for Claude
            subtopics = [f"{i+1}. {a.get('subtopic', 'Unknown')}" for i, a in enumerate(articles)]
            subtopics_text = "\n".join(subtopics)

            prompt = f"""Here are subtopics from {len(articles)} articles all classified as '{topic}':

{subtopics_text}

Group these into narrative clusters where articles are about the SAME specific story or theme.
Respond with ONLY a JSON array:
[{{"cluster_title": "<5-10 word English title>", "article_indices": [1, 4, 7], "summary": "<one sentence>"}}]

Rules:
- Only group articles that are genuinely about the same specific event or narrative
- A cluster needs at least {min_cluster_size} articles
- An article can only be in one cluster
- Articles about different aspects of the same broad topic should be SEPARATE clusters
- If no valid clusters exist, return an empty array []"""

            # Budget check before API call
            if not can_spend():
                logger.warning("budget_exhausted_skipping_llm_clustering", topic=topic)
                return self._cluster_by_keywords(articles, min_cluster_size)

            response = create_message(
                model=self.model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
                trace_name="cluster_by_subtopic",
                trace_metadata={"topic": topic, "article_count": len(articles), "task": "narrative_clustering"}
            )

            # Track spending
            add_spend(response.usage.input_tokens, response.usage.output_tokens)

            response_text = response.content[0].text.strip()

            # Handle markdown code blocks
            if response_text.startswith("```"):
                response_text = re.sub(r'^```json?\s*', '', response_text)
                response_text = re.sub(r'\s*```$', '', response_text)

            clusters = json.loads(response_text)

            # Validate clusters
            valid_clusters = []
            assigned_indices = set()

            for cluster in clusters:
                indices = cluster.get("article_indices", [])
                # Convert to 0-based indices
                indices = [i - 1 for i in indices if isinstance(i, int) and 1 <= i <= len(articles)]
                # Remove duplicates and already-assigned
                indices = [i for i in indices if i not in assigned_indices]

                if len(indices) >= min_cluster_size:
                    assigned_indices.update(indices)
                    valid_clusters.append({
                        "title": cluster.get("cluster_title", f"{topic} cluster"),
                        "summary": cluster.get("summary", ""),
                        "articles": [articles[i] for i in indices]
                    })

            return valid_clusters

        except Exception as e:
            error_str = str(e)
            # Check for credit/billing errors - fall back to keyword clustering
            if "credit" in error_str.lower() or "billing" in error_str.lower() or "400" in error_str:
                logger.warning("api_credits_exhausted_for_clustering", topic=topic, using_keyword_fallback=True)
                # Fall back to keyword-based clustering
                keyword_clusters = self.cluster_by_keyword_overlap(articles, min_overlap=1, min_cluster_size=min_cluster_size)

                result_clusters = []
                for i, cluster_articles in enumerate(keyword_clusters):
                    # Generate title from keywords
                    all_keywords = []
                    for a in cluster_articles:
                        all_keywords.extend(a.get("keywords", []))

                    keyword_counts = defaultdict(int)
                    for kw in all_keywords:
                        keyword_counts[kw.lower()] += 1

                    top_keywords = sorted(keyword_counts.keys(),
                                         key=lambda k: keyword_counts[k], reverse=True)[:3]

                    first_subtopic = cluster_articles[0].get("subtopic", topic)

                    result_clusters.append({
                        "title": f"{topic}: {first_subtopic}",
                        "summary": f"Cluster about {', '.join(top_keywords) if top_keywords else topic}",
                        "articles": cluster_articles
                    })

                return result_clusters

            logger.error("llm_clustering_error", topic=topic, error=error_str)
            return []

    def build_clusters(self, days: int = 7, min_cluster_size: int = 3) -> List[Dict[str, Any]]:
        """
        Build narrative clusters from classified articles.

        Strategy:
        - For topics with 5-20 articles: use keyword overlap
        - For topics with 20+ articles: use LLM subtopic clustering
        - For topics with <5 articles: skip (too small)
        """
        topic_groups = self.get_topic_groups(days=days)
        all_clusters = []

        for topic, articles in topic_groups.items():
            logger.info("clustering_topic", topic=topic, article_count=len(articles))

            if len(articles) < min_cluster_size:
                logger.info("topic_too_small", topic=topic, count=len(articles))
                continue

            clusters = []

            if len(articles) <= 20:
                # Use keyword overlap for smaller groups
                keyword_clusters = self.cluster_by_keyword_overlap(
                    articles,
                    min_overlap=2,
                    min_cluster_size=min_cluster_size
                )

                for i, cluster_articles in enumerate(keyword_clusters):
                    # Generate title from common keywords
                    all_keywords = []
                    for a in cluster_articles:
                        all_keywords.extend(a.get("keywords", []))

                    keyword_counts = defaultdict(int)
                    for kw in all_keywords:
                        keyword_counts[kw.lower()] += 1

                    top_keywords = sorted(keyword_counts.keys(),
                                         key=lambda k: keyword_counts[k], reverse=True)[:3]

                    # Use first article's subtopic as basis for title
                    first_subtopic = cluster_articles[0].get("subtopic", topic)

                    clusters.append({
                        "title": f"{topic}: {first_subtopic}",
                        "summary": f"Cluster about {', '.join(top_keywords)}",
                        "articles": cluster_articles
                    })
            else:
                # Use LLM for larger groups
                clusters = self.cluster_by_llm_subtopic(topic, articles, min_cluster_size)
                time.sleep(self.api_delay)  # Rate limit LLM calls

            # Add topic metadata to each cluster
            for cluster in clusters:
                cluster["topic"] = topic

            all_clusters.extend(clusters)
            logger.info("topic_clustered", topic=topic, clusters=len(clusters))

        logger.info("clustering_complete", total_clusters=len(all_clusters))
        return all_clusters

    # =========================================================================
    # STEP 3: GENERATE AI SUMMARY
    # =========================================================================

    def generate_ai_summary(self, cluster: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Generate a structured AI summary for a narrative cluster using Claude Haiku.

        Args:
            cluster: Cluster dict with articles, title, topic, etc.

        Returns:
            Dict with why_detected, spread_pattern, threat_signal, suggested_title, analyst_note
            or None if generation fails.
        """
        articles = cluster.get("articles", [])
        if not articles:
            return None

        # Gather cluster metadata
        keywords = []
        for article in articles:
            keywords.extend(article.get("keywords", []))
        # Deduplicate and get top keywords
        keyword_counts = defaultdict(int)
        for kw in keywords:
            keyword_counts[kw.lower()] += 1
        top_keywords = sorted(keyword_counts.keys(), key=lambda k: keyword_counts[k], reverse=True)[:10]

        # Source breakdown
        source_types = defaultdict(int)
        source_names = set()
        for a in articles:
            source_type = a.get("source_type", "UNKNOWN")
            source_types[source_type] += 1
            if a.get("source_name"):
                source_names.add(a["source_name"])

        # Time range
        dates = [a["published_at"] for a in articles if a.get("published_at")]
        first_seen = min(dates).strftime("%Y-%m-%d %H:%M") if dates else "Unknown"
        last_seen = max(dates).strftime("%Y-%m-%d %H:%M") if dates else "Unknown"

        # Article count by type
        telegram_count = source_types.get("TELEGRAM", 0)
        news_count = sum(v for k, v in source_types.items() if k != "TELEGRAM")

        # Top 5 article titles
        titles = [a.get("title", "")[:100] for a in articles[:5] if a.get("title")]
        titles_text = "\n".join(f"- {t}" for t in titles)

        # Check for coordination signals (high similarity across sources)
        unique_sources = len(source_names)
        is_multi_source = unique_sources >= 3

        # Build the prompt
        prompt = f"""Analyze this auto-detected narrative cluster and provide a structured summary for analyst review.

CLUSTER DATA:
- Keywords: {', '.join(top_keywords[:8])}
- Total articles: {len(articles)} ({news_count} news, {telegram_count} Telegram)
- Unique sources: {unique_sources}
- Source breakdown: {dict(source_types)}
- Time range: {first_seen} to {last_seen}
- Topic: {cluster.get('topic', 'Unknown')}

SAMPLE ARTICLE TITLES:
{titles_text}

Respond with ONLY this JSON object (no other text):
{{
  "why_detected": "<1-2 sentences: what pattern triggered this cluster - mention specific keywords, topics, or timing patterns>",
  "spread_pattern": "<1 sentence: single source, organic multi-source spread, or coordinated (same story at similar times from many sources)>",
  "threat_signal": "<one of: none, low, medium, high - based on negative sentiment, coordination signs, or sensitive topics>",
  "suggested_title": "<concise 5-10 word descriptive title for this narrative>",
  "analyst_note": "<1 sentence: what the analyst should verify or investigate further>"
}}"""

        try:
            # Budget check
            if not can_spend():
                logger.warning("budget_exhausted_skipping_ai_summary")
                return None

            response = create_message(
                model=self.model,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
                trace_name="generate_ai_summary",
                trace_metadata={
                    "article_count": len(articles),
                    "topic": cluster.get("topic", "Unknown"),
                    "task": "narrative_ai_summary"
                }
            )

            # Track spending
            add_spend(response.usage.input_tokens, response.usage.output_tokens)

            response_text = response.content[0].text.strip()

            # Handle markdown code blocks
            if response_text.startswith("```"):
                response_text = re.sub(r'^```json?\s*', '', response_text)
                response_text = re.sub(r'\s*```$', '', response_text)

            result = json.loads(response_text)

            # Validate required fields
            required_fields = ["why_detected", "spread_pattern", "threat_signal", "suggested_title", "analyst_note"]
            for field in required_fields:
                if field not in result:
                    result[field] = ""

            # Validate threat_signal value
            if result.get("threat_signal") not in ["none", "low", "medium", "high"]:
                result["threat_signal"] = "low"

            logger.info("ai_summary_generated", cluster_title=cluster.get("title", "")[:50])
            return result

        except json.JSONDecodeError as e:
            logger.warning("ai_summary_json_error", error=str(e), response=response_text[:200] if response_text else "")
            return None
        except Exception as e:
            error_str = str(e)
            if "credit" in error_str.lower() or "billing" in error_str.lower():
                logger.warning("ai_summary_credits_exhausted")
            else:
                logger.error("ai_summary_error", error=error_str)
            return None

    # =========================================================================
    # STEP 4: SAVE NARRATIVES
    # =========================================================================

    def save_narrative(self, cluster: Dict[str, Any]) -> Optional[int]:
        """
        Save a cluster as a narrative and link articles.
        Generates AI summary before persisting.

        Returns narrative ID.
        """
        articles = cluster["articles"]

        # Get organization_id from the articles' sources
        # Use the most common organization among the sources
        source_ids = [a.get("source_id") for a in articles if a.get("source_id")]
        organization_id = None

        if source_ids:
            with get_db() as db:
                result = db.execute(text("""
                    SELECT organization_id, COUNT(*) as cnt
                    FROM sources
                    WHERE id = ANY(:source_ids)
                    AND organization_id IS NOT NULL
                    GROUP BY organization_id
                    ORDER BY cnt DESC
                    LIMIT 1
                """), {"source_ids": list(set(source_ids))})
                row = result.fetchone()
                if row:
                    organization_id = row.organization_id

        if not organization_id:
            logger.warning("no_organization_id_for_narrative", cluster_title=cluster.get("title", ""))
            # Default to organization_id 2 (CivilNet) if no org found
            organization_id = 2

        # Merge and deduplicate keywords
        all_keywords = []
        for article in articles:
            all_keywords.extend(article.get("keywords", []))

        # Deduplicate and keep most common
        keyword_counts = defaultdict(int)
        for kw in all_keywords:
            keyword_counts[kw.lower()] += 1

        keywords = sorted(keyword_counts.keys(),
                         key=lambda k: keyword_counts[k], reverse=True)[:10]

        # Calculate dates
        dates = [a["published_at"] for a in articles if a.get("published_at")]
        first_seen = min(dates) if dates else datetime.utcnow()
        last_seen = max(dates) if dates else datetime.utcnow()

        # Calculate sentiment
        sentiments = [a["sentiment"] for a in articles if a.get("sentiment")]
        sentiment_counts = defaultdict(int)
        for s in sentiments:
            sentiment_counts[s] += 1

        # Dominant sentiment
        if sentiment_counts:
            dominant = max(sentiment_counts, key=sentiment_counts.get)
            avg_sentiment = {
                "POSITIVE": 0.8,
                "NEUTRAL": 0.5,
                "NEGATIVE": 0.2
            }.get(dominant, 0.5)
        else:
            avg_sentiment = 0.5

        # Source breakdown
        source_counts = defaultdict(int)
        for a in articles:
            source_type = a.get("source_type", "UNKNOWN")
            source_counts[source_type] += 1

        # Count telegram posts
        telegram_count = source_counts.get("TELEGRAM", 0)

        # Determine threat level
        negative_ratio = sentiment_counts.get("NEGATIVE", 0) / len(articles) if articles else 0
        if negative_ratio > 0.7 and len(articles) > 10:
            threat_level = "HIGH"
        elif negative_ratio > 0.5 or len(articles) > 15:
            threat_level = "MEDIUM"
        else:
            threat_level = "LOW"

        # Description
        sources = list(set(a.get("source_name") for a in articles if a.get("source_name")))
        description = (
            f"{cluster.get('summary', '')} "
            f"Cluster of {len(articles)} items from {len(sources)} sources. "
            f"Dominant sentiment: {dominant if sentiment_counts else 'Unknown'}. "
            f"Topic: {cluster.get('topic', 'Other')}."
        )

        # Generate AI summary for analyst review
        ai_summary = self.generate_ai_summary(cluster)
        ai_summary_json = json.dumps(ai_summary) if ai_summary else None
        ai_summary_generated_at = datetime.utcnow() if ai_summary else None

        with get_db() as db:
            # Insert narrative with PENDING_REVIEW status for analyst approval
            result = db.execute(text("""
                INSERT INTO narratives (
                    name, description, keywords, status, threat_level,
                    first_seen, last_seen, article_count, telegram_count,
                    avg_sentiment, source_breakdown, auto_generated,
                    ai_summary, ai_summary_generated_at, organization_id
                )
                VALUES (
                    :name, :description, :keywords, 'PENDING_REVIEW', :threat_level,
                    :first_seen, :last_seen, :article_count, :telegram_count,
                    :avg_sentiment, :source_breakdown, true,
                    :ai_summary, :ai_summary_generated_at, :organization_id
                )
                RETURNING id
            """), {
                "name": cluster["title"][:255],
                "description": description,
                "keywords": keywords,
                "threat_level": threat_level,
                "first_seen": first_seen,
                "last_seen": last_seen,
                "article_count": len(articles),
                "telegram_count": telegram_count,
                "avg_sentiment": avg_sentiment,
                "source_breakdown": json.dumps(dict(source_counts)),
                "ai_summary": ai_summary_json,
                "ai_summary_generated_at": ai_summary_generated_at,
                "organization_id": organization_id,
            })

            narrative_id = result.fetchone()[0]

            # Link articles to narrative
            article_ids = [a["id"] for a in articles]
            for article_id in article_ids:
                db.execute(text("""
                    UPDATE articles SET narrative_id = :narrative_id WHERE id = :article_id
                """), {"narrative_id": narrative_id, "article_id": article_id})

                # Also add to junction table for compatibility
                db.execute(text("""
                    INSERT INTO article_narratives (article_id, narrative_id, confidence, detected_at)
                    VALUES (:article_id, :narrative_id, 0.9, NOW())
                    ON CONFLICT (article_id, narrative_id) DO NOTHING
                """), {"article_id": article_id, "narrative_id": narrative_id})

            db.commit()

        logger.info("narrative_saved", id=narrative_id, title=cluster["title"], articles=len(articles))
        return narrative_id

    def save_all_clusters(self, clusters: List[Dict[str, Any]]) -> List[int]:
        """Save all clusters as narratives."""
        narrative_ids = []

        for cluster in clusters:
            try:
                narrative_id = self.save_narrative(cluster)
                if narrative_id:
                    narrative_ids.append(narrative_id)
            except Exception as e:
                logger.error("save_narrative_error", title=cluster.get("title"), error=str(e))

        return narrative_ids

    # =========================================================================
    # CLEANUP & FULL PIPELINE
    # =========================================================================

    def cleanup_old_narratives(self):
        """
        Delete old auto-generated narratives that are still pending review.
        Preserves narratives that analysts have approved (status != PENDING_REVIEW).
        """
        with get_db() as db:
            # Only clear article assignments for PENDING_REVIEW auto-generated narratives
            # Keep assignments for approved narratives
            db.execute(text("""
                UPDATE articles SET narrative_id = NULL
                WHERE narrative_id IN (
                    SELECT id FROM narratives
                    WHERE auto_generated = true
                    AND status = 'PENDING_REVIEW'
                )
            """))

            # Delete from junction table only for pending narratives
            db.execute(text("""
                DELETE FROM article_narratives
                WHERE narrative_id IN (
                    SELECT id FROM narratives
                    WHERE auto_generated = true
                    AND status = 'PENDING_REVIEW'
                )
            """))

            # Delete only PENDING_REVIEW auto-generated narratives
            # Keep approved ones (ACTIVE, MONITORING, RESOLVED, ARCHIVED)
            result = db.execute(text("""
                DELETE FROM narratives
                WHERE auto_generated = true
                AND status = 'PENDING_REVIEW'
                RETURNING id
            """))

            deleted_count = len(result.fetchall())
            db.commit()

            logger.info("cleanup_complete",
                       deleted_pending_narratives=deleted_count,
                       note="Approved narratives preserved")
            return deleted_count

    def run_full_pipeline(self, days: int = 7,
                          classify_limit: int = 500,
                          min_cluster_size: int = 3,
                          cleanup: bool = True) -> Dict[str, Any]:
        """
        Run the complete narrative clustering pipeline.

        Steps:
        1. Classify unclassified articles
        2. Build clusters from classified articles
        3. Save as narratives

        Returns summary statistics.
        """
        logger.info("starting_full_pipeline", days=days, classify_limit=classify_limit)

        # Step 0: Cleanup old auto-generated narratives
        if cleanup:
            deleted = self.cleanup_old_narratives()
            logger.info("cleaned_up_old_narratives", deleted=deleted)

        # Step 1: Classify unclassified articles
        classification_stats = self.classify_unclassified_articles(limit=classify_limit)

        # Step 2: Build clusters
        clusters = self.build_clusters(days=days, min_cluster_size=min_cluster_size)

        # Step 3: Save narratives
        narrative_ids = self.save_all_clusters(clusters)

        # Generate summary
        summary = {
            "classification": classification_stats,
            "clusters_created": len(clusters),
            "narratives_saved": len(narrative_ids),
            "narrative_ids": narrative_ids,
        }

        logger.info("pipeline_complete", **summary)
        return summary


# =============================================================================
# ENTRY POINTS
# =============================================================================

def classify_articles(limit: int = 500) -> Dict[str, int]:
    """Classify unclassified articles. Run every 2 hours."""
    pipeline = LLMNarrativeClustering()
    return pipeline.classify_unclassified_articles(limit=limit)


def rebuild_clusters(days: int = 7, min_cluster_size: int = 3) -> Dict[str, Any]:
    """Rebuild narrative clusters. Run every 4 hours."""
    pipeline = LLMNarrativeClustering()

    # Cleanup old auto-generated narratives
    pipeline.cleanup_old_narratives()

    # Build new clusters
    clusters = pipeline.build_clusters(days=days, min_cluster_size=min_cluster_size)

    # Save narratives
    narrative_ids = pipeline.save_all_clusters(clusters)

    return {
        "clusters": len(clusters),
        "narratives": len(narrative_ids),
        "ids": narrative_ids
    }


def run_full_pipeline(days: int = 7, classify_limit: int = 500) -> Dict[str, Any]:
    """Run the complete pipeline. Use for initial setup or full refresh."""
    pipeline = LLMNarrativeClustering()
    return pipeline.run_full_pipeline(
        days=days,
        classify_limit=classify_limit,
        min_cluster_size=3,
        cleanup=True
    )


def print_cluster_report(days: int = 7):
    """Print a detailed report of current clusters."""
    with get_db() as db:
        # Get topic distribution
        result = db.execute(text("""
            SELECT llm_topic, COUNT(*) as count
            FROM articles
            WHERE llm_topic IS NOT NULL
            GROUP BY llm_topic
            ORDER BY count DESC
        """))

        print("\n" + "="*80)
        print("ARTICLE CLASSIFICATION BY TOPIC")
        print("="*80)

        total = 0
        for row in result:
            print(f"  {row.llm_topic}: {row.count}")
            total += row.count
        print(f"  TOTAL: {total}")

        # Get narrative clusters
        result = db.execute(text("""
            SELECT
                n.id,
                n.name,
                n.keywords,
                n.article_count,
                n.telegram_count,
                n.first_seen,
                n.last_seen,
                n.threat_level,
                n.source_breakdown
            FROM narratives n
            WHERE n.auto_generated = true
            ORDER BY n.article_count DESC
        """))

        narratives = list(result)

        print("\n" + "="*80)
        print(f"NARRATIVE CLUSTERS ({len(narratives)} total)")
        print("="*80)

        for i, n in enumerate(narratives[:20], 1):
            print(f"\n{i}. {n.name}")
            print(f"   Articles: {n.article_count} | Telegram: {n.telegram_count}")
            print(f"   Date Range: {n.first_seen.strftime('%Y-%m-%d') if n.first_seen else 'N/A'} to {n.last_seen.strftime('%Y-%m-%d') if n.last_seen else 'N/A'}")
            print(f"   Threat Level: {n.threat_level}")
            print(f"   Keywords: {', '.join(n.keywords[:5]) if n.keywords else 'None'}")
            if n.source_breakdown:
                try:
                    sources = json.loads(n.source_breakdown) if isinstance(n.source_breakdown, str) else n.source_breakdown
                    print(f"   Sources: {sources}")
                except:
                    pass

        # Show article titles for top 3 clusters
        print("\n" + "="*80)
        print("TOP 3 CLUSTERS - ARTICLE VERIFICATION")
        print("="*80)

        for n in narratives[:3]:
            print(f"\n>>> {n.name}")
            print("-" * 60)

            articles = db.execute(text("""
                SELECT title, source_id, published_at
                FROM articles
                WHERE narrative_id = :nid
                ORDER BY published_at DESC
                LIMIT 5
            """), {"nid": n.id})

            for a in articles:
                title = a.title[:80] if a.title else "No title"
                print(f"  - {title}...")

        print("\n" + "="*80)


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "classify":
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 500
            result = classify_articles(limit=limit)
            print(f"Classified {result['classified']} articles")

        elif command == "cluster":
            days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
            result = rebuild_clusters(days=days)
            print(f"Created {result['clusters']} clusters, saved {result['narratives']} narratives")

        elif command == "full":
            result = run_full_pipeline()
            print(f"Pipeline complete: {result}")

        elif command == "report":
            print_cluster_report()

        else:
            print(f"Unknown command: {command}")
            print("Usage: python llm_narrative_clustering.py [classify|cluster|full|report]")
    else:
        # Default: run full pipeline
        result = run_full_pipeline()
        print_cluster_report()

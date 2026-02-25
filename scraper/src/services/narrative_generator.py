"""
Automatic Narrative Clustering for AIIM

Uses TF-IDF vectorization and Agglomerative Clustering to automatically
detect narrative themes from scraped news articles and Telegram posts.
"""

import structlog
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import AgglomerativeClustering
from sqlalchemy import text
from anthropic import Anthropic

from ..config import get_settings
from ..database import get_db
from ..budget_tracker import can_spend, add_spend

logger = structlog.get_logger()
settings = get_settings()


def clean_html(text: str) -> str:
    """Remove HTML tags and clean text for processing."""
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


class NarrativeGenerator:
    """Generates narrative clusters from article content using ML."""

    def __init__(self):
        self.anthropic = Anthropic(api_key=settings.anthropic_api_key)
        # Extended stopwords including HTML artifacts and common noise
        custom_stopwords = [
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
            'used', 'it', 'its', 'this', 'that', 'these', 'those', 'he', 'she', 'they',
            'we', 'you', 'i', 'my', 'your', 'his', 'her', 'their', 'our', 'which',
            'who', 'whom', 'what', 'where', 'when', 'why', 'how', 'all', 'each',
            'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
            'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
            # Common HTML/web artifacts
            'div', 'span', 'class', 'style', 'font', 'br', 'nbsp', 'href', 'http',
            'https', 'www', 'com', 'html', 'img', 'src', 'alt', 'width', 'height',
            'px', 'em', 'pt', 'color', 'background', 'border', 'margin', 'padding',
            # Common Armenian articles and particles
            'եdelays', 'է', 'եdelays', 'որ', 'այն', 'այս', 'մdelays', 'delays', 'եdelays',
            # Common Russian stopwords
            'и', 'в', 'не', 'на', 'что', 'с', 'по', 'для', 'это', 'как', 'из',
            # News-related common words
            'said', 'says', 'told', 'according', 'report', 'reports', 'reported',
            'news', 'today', 'yesterday', 'also', 'new', 'year', 'years', 'time',
        ]
        self.vectorizer = TfidfVectorizer(
            max_features=3000,
            ngram_range=(1, 2),
            stop_words=custom_stopwords,
            min_df=2,  # Term must appear in at least 2 documents
            max_df=0.90,  # Ignore terms appearing in >90% of docs
            token_pattern=r'(?u)\b[a-zA-Z\u0531-\u058F\u0400-\u04FF]{3,}\b',  # Min 3 chars, allow Armenian/Russian
        )

    def fetch_recent_content(self, days: int = 7) -> List[Dict[str, Any]]:
        """Fetch articles and Telegram posts from the last N days."""
        since = datetime.utcnow() - timedelta(days=days)

        with get_db() as db:
            # Fetch articles with their sentiment
            result = db.execute(text("""
                SELECT
                    a.id,
                    a.title,
                    a.content,
                    a.published_at,
                    a.source_id,
                    s.name as source_name,
                    s.type as source_type,
                    sr.sentiment,
                    sr.confidence as sentiment_confidence
                FROM articles a
                LEFT JOIN sources s ON a.source_id = s.id
                LEFT JOIN sentiment_results sr ON a.id = sr.article_id
                WHERE a.published_at >= :since
                AND a.title IS NOT NULL
                AND LENGTH(a.title) > 10
                ORDER BY a.published_at DESC
            """), {"since": since})

            articles = []
            for row in result:
                # Combine title and content, handle None, clean HTML
                content = clean_html(row.content or "")
                title = clean_html(row.title or "")
                combined_text = f"{title} {content[:2000]}"  # Limit content length

                articles.append({
                    "id": row.id,
                    "title": row.title,
                    "content": content[:500],  # Keep snippet for display
                    "combined_text": combined_text,
                    "published_at": row.published_at,
                    "source_id": row.source_id,
                    "source_name": row.source_name,
                    "source_type": row.source_type,
                    "sentiment": row.sentiment,
                    "sentiment_confidence": float(row.sentiment_confidence) if row.sentiment_confidence else None,
                })

            logger.info("fetched_recent_content", count=len(articles), days=days)
            return articles

    def cluster_articles(self, articles: List[Dict[str, Any]],
                         distance_threshold: float = 1.3,
                         min_cluster_size: int = 3) -> Dict[int, List[Dict[str, Any]]]:
        """
        Cluster articles using TF-IDF and Agglomerative Clustering.

        Args:
            articles: List of article dicts with 'combined_text' field
            distance_threshold: Distance threshold for clustering (lower = tighter clusters)
            min_cluster_size: Minimum articles to form a valid cluster

        Returns:
            Dict mapping cluster_id to list of articles in that cluster
        """
        if len(articles) < min_cluster_size:
            logger.warning("not_enough_articles", count=len(articles), min_required=min_cluster_size)
            return {}

        # Extract texts for vectorization
        texts = [a["combined_text"] for a in articles]

        # TF-IDF Vectorization
        logger.info("vectorizing_articles", count=len(texts))
        try:
            tfidf_matrix = self.vectorizer.fit_transform(texts)
        except ValueError as e:
            logger.error("vectorization_failed", error=str(e))
            return {}

        # Agglomerative Clustering
        logger.info("clustering_articles",
                   matrix_shape=tfidf_matrix.shape,
                   distance_threshold=distance_threshold)

        clustering = AgglomerativeClustering(
            n_clusters=None,
            distance_threshold=distance_threshold,
            metric='euclidean',
            linkage='ward',
        )

        # Need dense array for clustering
        labels = clustering.fit_predict(tfidf_matrix.toarray())

        # Group articles by cluster
        clusters = defaultdict(list)
        for idx, label in enumerate(labels):
            clusters[label].append(articles[idx])

        # Filter to clusters meeting minimum size
        valid_clusters = {
            cid: articles
            for cid, articles in clusters.items()
            if len(articles) >= min_cluster_size
        }

        logger.info("clustering_complete",
                   total_clusters=len(clusters),
                   valid_clusters=len(valid_clusters),
                   articles_in_valid_clusters=sum(len(a) for a in valid_clusters.values()))

        return valid_clusters

    def extract_cluster_keywords(self, cluster_articles: List[Dict[str, Any]],
                                  top_n: int = 5) -> List[str]:
        """Extract top keywords from a cluster using TF-IDF scores."""
        texts = [a["combined_text"] for a in cluster_articles]

        # Stopwords for keyword extraction
        stopwords = [
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'have', 'has', 'had', 'said', 'says', 'told', 'according',
            'news', 'today', 'yesterday', 'also', 'new', 'year', 'years',
            'div', 'span', 'class', 'style', 'font', 'br', 'nbsp', 'href',
            'http', 'https', 'www', 'com', 'html', 'img',
        ]

        # Fit a new vectorizer on just this cluster
        cluster_vectorizer = TfidfVectorizer(
            max_features=500,
            ngram_range=(1, 2),
            stop_words=stopwords,
            min_df=1,
            token_pattern=r'(?u)\b[a-zA-Z\u0531-\u058F\u0400-\u04FF]{3,}\b',
        )

        try:
            tfidf_matrix = cluster_vectorizer.fit_transform(texts)
        except ValueError:
            return []

        # Sum TF-IDF scores across all documents in cluster
        feature_names = cluster_vectorizer.get_feature_names_out()
        tfidf_sums = np.array(tfidf_matrix.sum(axis=0)).flatten()

        # Get top N keywords
        top_indices = tfidf_sums.argsort()[-top_n:][::-1]
        keywords = [feature_names[i] for i in top_indices]

        return keywords

    def generate_narrative_title(self, keywords: List[str],
                                  sample_titles: List[str]) -> str:
        """Use Claude to generate a concise narrative title."""
        prompt = f"""Given these keywords and article headlines from a cluster of related Armenian news content, generate a concise 5-10 word English title for this narrative theme. Respond with only the title, no quotes or explanation.

Keywords: {', '.join(keywords)}

Sample headlines:
{chr(10).join(f'- {t}' for t in sample_titles[:5])}"""

        try:
            # Budget check before API call
            if not can_spend():
                logger.warning("budget_exhausted_using_keyword_title")
                return f"Narrative: {', '.join(keywords[:3])}"

            # Using Haiku for cost optimization (~10x cheaper than Sonnet, sufficient for translation/sentiment/clustering)
            response = self.anthropic.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=50,
                messages=[{"role": "user", "content": prompt}]
            )

            # Track spending
            add_spend(response.usage.input_tokens, response.usage.output_tokens)

            title = response.content[0].text.strip().strip('"\'')
            return title[:100]  # Ensure reasonable length
        except Exception as e:
            logger.error("title_generation_failed", error=str(e))
            # Fallback: use first keyword-based title
            return f"Narrative: {', '.join(keywords[:3])}"

    def analyze_cluster(self, cluster_id: int,
                        articles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze a single cluster and extract metadata."""
        # Extract keywords
        keywords = self.extract_cluster_keywords(articles)

        # Get sample titles for Claude
        sample_titles = [a["title"] for a in articles[:5]]

        # Generate title
        title = self.generate_narrative_title(keywords, sample_titles)

        # Calculate sentiment distribution
        sentiments = [a["sentiment"] for a in articles if a["sentiment"]]
        sentiment_counts = defaultdict(int)
        for s in sentiments:
            sentiment_counts[s] += 1

        # Determine dominant sentiment
        if sentiment_counts:
            dominant_sentiment = max(sentiment_counts, key=sentiment_counts.get)
            sentiment_ratio = sentiment_counts[dominant_sentiment] / len(sentiments)
        else:
            dominant_sentiment = None
            sentiment_ratio = 0

        # Date range
        dates = [a["published_at"] for a in articles if a["published_at"]]
        first_seen = min(dates) if dates else datetime.utcnow()
        last_seen = max(dates) if dates else datetime.utcnow()

        # Sources involved
        sources = list(set(a["source_name"] for a in articles if a["source_name"]))

        # Determine threat level based on sentiment and volume
        negative_ratio = sentiment_counts.get("NEGATIVE", 0) / len(articles) if articles else 0
        if negative_ratio > 0.7 and len(articles) > 10:
            threat_level = "HIGH"
        elif negative_ratio > 0.5 or len(articles) > 15:
            threat_level = "MEDIUM"
        else:
            threat_level = "LOW"

        return {
            "name": title,
            "description": f"Auto-detected narrative cluster with {len(articles)} articles from {len(sources)} sources. "
                          f"Dominant sentiment: {dominant_sentiment or 'Unknown'} ({sentiment_ratio:.0%}). "
                          f"Keywords: {', '.join(keywords)}",
            "keywords": keywords,
            "status": "ACTIVE",
            "threat_level": threat_level,
            "first_seen": first_seen,
            "last_seen": last_seen,
            "article_count": len(articles),
            "articles": articles,
            "sources": sources,
            "sentiment_distribution": dict(sentiment_counts),
        }

    def save_narrative(self, narrative: Dict[str, Any]) -> Optional[int]:
        """Save a narrative to the database and link articles."""
        with get_db() as db:
            # Check if similar narrative already exists (by name similarity)
            existing = db.execute(text("""
                SELECT id, name, keywords FROM narratives
                WHERE status = 'ACTIVE'
                AND name ILIKE :name_pattern
            """), {"name_pattern": f"%{narrative['name'][:30]}%"}).fetchone()

            if existing:
                logger.info("narrative_exists", existing_name=existing.name, new_name=narrative["name"])
                # Update existing narrative
                narrative_id = existing.id
                db.execute(text("""
                    UPDATE narratives SET
                        article_count = :article_count,
                        last_seen = :last_seen,
                        updated_at = NOW()
                    WHERE id = :id
                """), {
                    "id": narrative_id,
                    "article_count": narrative["article_count"],
                    "last_seen": narrative["last_seen"],
                })
            else:
                # Insert new narrative
                result = db.execute(text("""
                    INSERT INTO narratives (name, description, keywords, status, threat_level,
                                           first_seen, last_seen, article_count)
                    VALUES (:name, :description, :keywords, :status, :threat_level,
                            :first_seen, :last_seen, :article_count)
                    ON CONFLICT (name) DO UPDATE SET
                        article_count = :article_count,
                        last_seen = :last_seen,
                        updated_at = NOW()
                    RETURNING id
                """), {
                    "name": narrative["name"],
                    "description": narrative["description"],
                    "keywords": narrative["keywords"],
                    "status": narrative["status"],
                    "threat_level": narrative["threat_level"],
                    "first_seen": narrative["first_seen"],
                    "last_seen": narrative["last_seen"],
                    "article_count": narrative["article_count"],
                })
                narrative_id = result.fetchone()[0]
                logger.info("narrative_created", id=narrative_id, name=narrative["name"])

            # Link articles to narrative
            article_ids = [a["id"] for a in narrative["articles"]]
            for article_id in article_ids:
                db.execute(text("""
                    INSERT INTO article_narratives (article_id, narrative_id, confidence, detected_at)
                    VALUES (:article_id, :narrative_id, 0.8, NOW())
                    ON CONFLICT (article_id, narrative_id) DO NOTHING
                """), {"article_id": article_id, "narrative_id": narrative_id})

            db.commit()
            return narrative_id

    def run(self, days: int = 7,
            distance_threshold: float = 1.3,
            min_cluster_size: int = 3) -> List[Dict[str, Any]]:
        """
        Run the full narrative generation pipeline.

        Returns list of generated narratives with metadata.
        """
        logger.info("starting_narrative_generation", days=days)

        # Fetch content
        articles = self.fetch_recent_content(days=days)
        if not articles:
            logger.warning("no_articles_found")
            return []

        # Cluster articles
        clusters = self.cluster_articles(
            articles,
            distance_threshold=distance_threshold,
            min_cluster_size=min_cluster_size
        )

        if not clusters:
            logger.warning("no_valid_clusters_found")
            return []

        # Analyze and save each cluster
        narratives = []
        for cluster_id, cluster_articles in clusters.items():
            logger.info("analyzing_cluster", cluster_id=cluster_id, size=len(cluster_articles))

            narrative = self.analyze_cluster(cluster_id, cluster_articles)
            narrative_id = self.save_narrative(narrative)
            narrative["id"] = narrative_id
            narratives.append(narrative)

        # Sort by article count
        narratives.sort(key=lambda x: x["article_count"], reverse=True)

        logger.info("narrative_generation_complete",
                   total_narratives=len(narratives),
                   total_articles_clustered=sum(n["article_count"] for n in narratives))

        return narratives


def generate_narratives(days: int = 7) -> List[Dict[str, Any]]:
    """Main entry point for narrative generation."""
    generator = NarrativeGenerator()
    return generator.run(days=days)


def print_narrative_report(narratives: List[Dict[str, Any]]):
    """Print a formatted report of generated narratives."""
    print("\n" + "="*80)
    print("NARRATIVE CLUSTERING REPORT")
    print("="*80)

    print(f"\nTotal clusters found: {len(narratives)}")
    print(f"Total articles clustered: {sum(n['article_count'] for n in narratives)}")

    print("\n" + "-"*80)
    print("TOP 5 CLUSTERS BY SIZE:")
    print("-"*80)

    for i, narrative in enumerate(narratives[:5], 1):
        print(f"\n{i}. {narrative['name']}")
        print(f"   Articles: {narrative['article_count']}")
        print(f"   Sources: {', '.join(narrative['sources'][:5])}" +
              (f" (+{len(narrative['sources'])-5} more)" if len(narrative['sources']) > 5 else ""))
        print(f"   Date Range: {narrative['first_seen'].strftime('%Y-%m-%d')} to {narrative['last_seen'].strftime('%Y-%m-%d')}")
        print(f"   Sentiment: {narrative['sentiment_distribution']}")
        print(f"   Threat Level: {narrative['threat_level']}")
        print(f"   Keywords: {', '.join(narrative['keywords'])}")

    # Show largest cluster details
    if narratives:
        largest = narratives[0]
        print("\n" + "-"*80)
        print(f"LARGEST CLUSTER DETAILS: {largest['name']}")
        print("-"*80)
        print("\nArticle Titles:")
        for article in largest["articles"][:15]:
            print(f"  - {article['title'][:80]}...")
        if len(largest["articles"]) > 15:
            print(f"  ... and {len(largest['articles']) - 15} more articles")

    print("\n" + "="*80)


if __name__ == "__main__":
    # Run standalone for testing
    narratives = generate_narratives(days=7)
    print_narrative_report(narratives)

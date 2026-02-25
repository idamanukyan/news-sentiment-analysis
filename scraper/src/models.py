from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class SourceType(enum.Enum):
    RSS = "RSS"
    WEB_SCRAPE = "WEB_SCRAPE"
    TELEGRAM = "TELEGRAM"
    FACEBOOK = "FACEBOOK"


class Language(enum.Enum):
    ARMENIAN = "ARMENIAN"
    RUSSIAN = "RUSSIAN"
    ENGLISH = "ENGLISH"


class Sentiment(enum.Enum):
    POSITIVE = "POSITIVE"
    NEGATIVE = "NEGATIVE"
    NEUTRAL = "NEUTRAL"


class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    type = Column(String(50), nullable=False)
    language = Column(String(20), nullable=False)
    config = Column(JSONB)
    active = Column(Boolean, default=True)
    last_fetched = Column(DateTime(timezone=True))
    last_success = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    articles = relationship("Article", back_populates="source")


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=True)
    topic_id = Column(Integer, nullable=True)  # FK constraint exists in DB
    narrative_id = Column(Integer, nullable=True)  # FK to narratives table
    external_id = Column(String(500))
    title = Column(Text, nullable=False)
    content = Column(Text)
    url = Column(String(500))
    author = Column(String(255))
    published_at = Column(DateTime(timezone=True))
    fetched_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    content_hash = Column(String(64))
    extra_data = Column("metadata", JSONB)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # New fields for unified content model
    source_type = Column(String(20), default="NEWS")  # NEWS, TELEGRAM, SOCIAL
    platform = Column(String(50))  # web, telegram, facebook, etc.
    engagement_count = Column(Integer, default=0)  # views, shares, reactions
    language = Column(String(10), default="en")

    # LLM classification fields (V11 migration)
    llm_topic = Column(String(50))  # e.g., "Elections", "Foreign Policy"
    llm_keywords = Column(ARRAY(Text))  # English keywords
    llm_subtopic = Column(String(255))  # Brief description of specific story
    llm_classified_at = Column(DateTime(timezone=True))

    # Translation fields (V14 migration) - for cross-article matching
    title_en = Column(Text)  # English translation of title
    content_en = Column(Text)  # English translation of content
    detected_language = Column(String(10), default="hy")  # ISO 639-1: hy, ru, en
    translated_at = Column(DateTime(timezone=True))

    source = relationship("Source", back_populates="articles")
    sentiment_result = relationship("SentimentResult", back_populates="article", uselist=False)


class SentimentResult(Base):
    __tablename__ = "sentiment_results"

    id = Column(Integer, primary_key=True)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    sentiment = Column(String(20), nullable=False)
    confidence = Column(Numeric(3, 2))
    model_version = Column(String(50))
    reasoning = Column(Text)
    topics = Column(ARRAY(Text))
    entities = Column(JSONB)
    processed_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    article = relationship("Article", back_populates="sentiment_result")

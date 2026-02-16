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
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=False)
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

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "newssentiment"
    db_user: str = "postgres"
    db_password: str = "postgres"

    # Anthropic
    anthropic_api_key: str = ""

    # OpenAI (fallback)
    openai_api_key: str = ""

    # NewsAPI.org for global news search
    newsapi_key: str = ""

    # Scraping
    scrape_interval_minutes: int = 15
    max_articles_per_source: int = 50

    # Logging
    log_level: str = "INFO"

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

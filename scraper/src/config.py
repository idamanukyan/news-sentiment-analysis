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

    # Langfuse (LLM observability)
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"
    langfuse_enabled: bool = True

    # NewsAPI.org for global news search
    newsapi_key: str = ""

    # Telegram API (get from https://my.telegram.org)
    telegram_api_id: str = ""
    telegram_api_hash: str = ""
    telegram_phone: str = ""
    telegram_bot_token: str = ""  # Alternative: get from @BotFather

    # Facebook cookies for authenticated scraping
    # Get these from browser after logging into Facebook
    facebook_cookies: str = ""  # JSON string or cookie string format

    # Scraping
    scrape_interval_minutes: int = 30
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

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "CivIQ API"
    env: str = "dev"
    database_url: str = "postgresql+psycopg://civiq:civiq@localhost:5432/civiq"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    frontend_url: str = "http://localhost:3000"
    s3_endpoint_url: str = ""
    s3_bucket: str = "civiq-files"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_region: str = "us-east-1"
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    smtp_url: str = ""
    mail_from: str = "noreply@civiq.ai"
    local_files_dir: str = "./data/files"


settings = Settings()

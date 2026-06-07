import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "DataSherlock AI"
    API_V1_STR: str = "/api"
    
    # Storage settings
    DATABASE_URL: str = "sqlite:///./datasherlock.db"
    UPLOAD_DIR: str = "./uploads"
    
    # Azure Settings
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_DEPLOYMENT_NAME: str = "gpt-4o"
    AZURE_OPENAI_API_VERSION: str = "2024-02-15-preview"
    
    # Toggle to use live Azure OpenAI or mock AI outputs
    MOCK_AZURE: bool = True

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()

# Create upload directory if it does not exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

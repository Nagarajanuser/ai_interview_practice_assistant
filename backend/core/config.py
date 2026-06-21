import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory path
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(dotenv_path=BASE_DIR / ".env")

class Settings:
    PROJECT_NAME: str = "AI Interview Practice Assistant API"
    PROJECT_VERSION: str = "1.0.0"
    
    # DB configs
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "Nag@1234")
    DB_DATABASE: str = os.getenv("DB_DATABASE", "interview_practice")
    
    # LLM configs
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
    
    # CORS configs
    cors_origins_str: str = os.getenv("CORS_ORIGINS", "http://localhost:4200,http://127.0.0.1:4200")
    
    @property
    def CORS_ORIGINS(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_str.split(",") if origin.strip()]

settings = Settings()

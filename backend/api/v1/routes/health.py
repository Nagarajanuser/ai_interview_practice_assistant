from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def home():
    return {"message": "FastAPI + Ollama Running"}

@router.get("/health")
def health():
    return {"status": "healthy"}

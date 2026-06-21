from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

def init_middlewares(app: FastAPI):
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

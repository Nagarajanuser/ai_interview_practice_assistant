import uvicorn
from fastapi import FastAPI
from core.config import settings
from core.database import startup_db_init
from core.middleware import init_middlewares
from shared.exceptions.exception_handler import init_exception_handlers
from api.v1.routes import chat, health

# Instantiate FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION
)

# Initialize middlewares (CORS)
init_middlewares(app)

# Initialize custom exception handlers
init_exception_handlers(app)

# Register versioned routes
app.include_router(chat.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")
# Register home route at root prefix for legacy client compatibility or root testing
app.include_router(health.router)

@app.on_event("startup")
def startup_event():
    # Initialize database tables and populate defaults if needed
    startup_db_init()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

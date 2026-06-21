from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from shared.exceptions.custom_exception import CustomAPIException

def init_exception_handlers(app: FastAPI):
    @app.exception_handler(CustomAPIException)
    async def custom_exception_handler(request: Request, exc: CustomAPIException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"status": "error", "detail": exc.detail}
        )

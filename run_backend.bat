@echo off
cd /d "%~dp0\backend"
echo Starting FastAPI backend using virtual environment...
.\venv\Scripts\uvicorn main:app --reload
pause

@echo off
REM DealForge - Quick Start Script for Windows
REM Run this to start both backend and frontend

echo.
echo  DealForge - Real-Time AI Deal Negotiator
echo  ==========================================
echo.

REM Backend setup
echo  Setting up backend...
cd backend

if not exist "venv" (
    echo   Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo   Installing dependencies...
pip install -r requirements.txt -q

if not exist ".env" (
    echo   Creating .env from template...
    copy env.template .env
)

echo   Starting backend on port 8000...
start /B uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
cd ..

REM Frontend setup
echo.
echo  Setting up frontend...
cd frontend

if not exist "node_modules" (
    echo   Installing npm dependencies...
    call npm install --silent
)

echo   Starting frontend on port 3000...
start /B npm run dev
cd ..

echo.
echo  DealForge is running!
echo.
echo    PC Dashboard:     http://localhost:3000
echo    Phone Companion:  http://localhost:3000/mobile
echo    API:              http://localhost:8000
echo    API Docs:         http://localhost:8000/docs
echo.
echo  Press Ctrl+C to stop all services
pause

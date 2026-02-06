#!/bin/bash
# DealForge - Quick Start Script
# Run this to start both backend and frontend

echo "🔨 DealForge - Real-Time AI Deal Negotiator"
echo "============================================"
echo ""

# Check prerequisites
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }

# Backend setup
echo "📦 Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

echo "  Installing dependencies..."
pip install -r requirements.txt -q

if [ ! -f ".env" ]; then
    echo "  Creating .env from template..."
    cp env.template .env
fi

echo "  Starting backend on port 8000..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Frontend setup
echo ""
echo "📦 Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "  Installing npm dependencies..."
    npm install --silent
fi

echo "  Starting frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ DealForge is running!"
echo ""
echo "  🖥️  PC Dashboard:     http://localhost:3000"
echo "  📱 Phone Companion:   http://localhost:3000/mobile"
echo "  🔌 API:               http://localhost:8000"
echo "  📚 API Docs:          http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop all services"

# Handle cleanup
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait

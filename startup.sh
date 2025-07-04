#!/bin/bash

# Clinical DMP Generator - Development Startup Script
# This script starts both the backend and frontend for development

echo "🏥 Clinical DMP Generator - Development Startup"
echo "=============================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your ANTHROPIC_API_KEY"
    echo "Press Enter to continue after adding the API key..."
    read
fi

# Check Node.js version
echo "Checking Node.js version..."
node_version=$(node -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Node.js is not installed. Please install Node.js 18.0.0 or higher."
    exit 1
fi
echo "✅ Node.js $node_version detected"

# Install backend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Installing backend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo ""
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
fi

# Create necessary directories
echo ""
echo "Creating necessary directories..."
mkdir -p output logs temp

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Start the application
echo ""
echo "========================================="
echo "Starting services..."
echo "========================================="
echo ""
echo "📌 Backend API: http://localhost:3000"
echo "📌 Frontend UI: http://localhost:3001"
echo "📌 API Health: http://localhost:3000/health"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================="
echo ""

# Start both services using npm script
npm run dev:all
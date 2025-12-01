@echo off
REM FlowDoc Startup Script for Windows
REM This script starts the FlowDoc server in production mode

echo =========================================
echo 🚀 Starting FlowDoc Server
echo =========================================

REM Check if .env exists
if not exist .env (
    echo ❌ Error: .env file not found!
    echo Please copy .env.example to .env and configure it.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo 📦 Installing dependencies...
    call npm install
)

REM Check if dist folder exists
if not exist dist (
    echo 🔨 Building frontend...
    call npm run build
)

REM Start the server
echo ✅ Starting server...
set NODE_ENV=production
node server.js

pause


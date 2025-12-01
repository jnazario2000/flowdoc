#!/bin/bash

# FlowDoc Startup Script
# This script starts the FlowDoc server in production mode

echo "========================================="
echo "🚀 Starting FlowDoc Server"
echo "========================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "🔨 Building frontend..."
    npm run build
fi

# Start the server
echo "✅ Starting server..."
NODE_ENV=production node server.js


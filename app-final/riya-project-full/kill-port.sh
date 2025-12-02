#!/bin/bash

# Kill process on port 3000 (or specified port)
PORT=${1:-3000}

echo "🔍 Checking port $PORT..."

PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
    echo "✅ Port $PORT is free"
    exit 0
fi

echo "⚠️  Port $PORT is in use by process $PID"
echo "🛑 Killing process..."

kill -9 $PID 2>/dev/null

sleep 1

if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "❌ Failed to free port $PORT"
    exit 1
else
    echo "✅ Port $PORT is now free"
    exit 0
fi

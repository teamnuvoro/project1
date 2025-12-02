#!/bin/bash

# Kill ControlCenter to free port 5000
echo "🔪 Killing ControlCenter to free port 5000..."
killall -9 ControlCenter 2>/dev/null

# Wait briefly
sleep 0.5

# Start the server immediately
echo "🚀 Starting server on port 5000..."
npm run dev


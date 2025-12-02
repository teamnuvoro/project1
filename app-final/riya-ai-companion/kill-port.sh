#!/bin/bash

# Find and kill process on port 5001
echo "🔍 Finding process on port 5001..."
lsof -ti:5001 | xargs kill -9 2>/dev/null

# Find and kill process on port 5000
echo "🔍 Finding process on port 5000..."
lsof -ti:5000 | xargs kill -9 2>/dev/null

echo "✅ Ports cleared!"

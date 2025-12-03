#!/bin/bash

# Vercel Build Script
# This ensures paths are correctly resolved in Vercel's build environment

echo "🔍 Current directory: $(pwd)"
echo "📁 Listing root files:"
ls -la | head -10

echo "📁 Checking client directory:"
ls -la client/ | head -5

echo "📄 Checking if client/index.html exists:"
if [ -f "client/index.html" ]; then
    echo "✅ client/index.html found!"
else
    echo "❌ client/index.html NOT found!"
    exit 1
fi

echo "🔨 Running vite build from client directory..."
cd client
npx vite build --outDir ../dist/public --emptyOutDir
cd ..

if [ $? -eq 0 ]; then
    echo "✅ Vite build succeeded!"
else
    echo "❌ Vite build failed!"
    exit 1
fi

echo "🔨 Running esbuild for server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

if [ $? -eq 0 ]; then
    echo "✅ Server build succeeded!"
else
    echo "❌ Server build failed!"
    exit 1
fi

echo "🎉 Build completed successfully!"


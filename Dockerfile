# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json package-lock.json ./

# Install dependencies (no dev pruning so we can build)
RUN npm ci

# Copy config and source needed for build (Tailwind/PostCSS must be at root for content paths)
COPY vite.config.mts ./
COPY tsconfig.json drizzle.config.ts ./
COPY tailwind.config.ts postcss.config.js index.html ./
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY api ./api
COPY lib ./lib

# Build frontend (Vite) and server bundle
RUN npm run build && npm run build:server

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built artifacts from builder (server is fully bundled in dist/server.mjs)
COPY --from=builder /app/dist ./dist

# Default port (override with -e PORT=... when running)
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start the server (test locally: docker run -p 3000:3000 <image>)
CMD ["node", "dist/server.mjs"]

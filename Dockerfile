# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS client-builder
WORKDIR /app
# Copy client package files
COPY client/package*.json ./client/
# Install client dependencies
RUN cd client && npm install
# Copy client source
COPY client/ ./client/
# Set environment for production build
ENV VITE_API_URL=""
# Build client
RUN cd client && npm run build

# --- Stage 2: Build Backend ---
FROM node:20-alpine AS server-builder
WORKDIR /app
# Copy server package files
COPY server/package*.json ./server/
# Install server dependencies
RUN cd server && npm install
# Copy server source
COPY server/ ./server/
# Build server (compiles TS to dist/)
RUN cd server && npm run build

# --- Stage 3: Final Production Image ---
FROM node:20-alpine
WORKDIR /app

# Copy built server assets
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/package*.json ./
COPY db ./db

# Install ONLY production dependencies to keep image small
RUN npm install --omit=dev

# Copy built frontend assets to a directory the server can access
COPY --from=client-builder /app/client/dist ./client-dist

# Create uploads directory for persistent storage
RUN mkdir -p /app/uploads

# Expose Express port
EXPOSE 3000

ENV NODE_ENV=production
CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/server.js"]

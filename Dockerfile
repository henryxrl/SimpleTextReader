# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/

# Install server dependencies
RUN cd server && npm install && cd ..

# Create client/app directory and its package.json
RUN mkdir -p ./client/app && \
    echo '{"type": "module"}' > ./client/app/package.json

# Create shared directory and its package.json
RUN mkdir -p ./shared && \
    echo '{"type": "module"}' > ./shared/package.json

# Create assets directory and its package.json
RUN mkdir -p ./assets && \
    echo '{"type": "module"}' > ./assets/package.json

# Copy source files
COPY shared/ ./shared/
COPY server/app/ ./server/app/
COPY client/css/ ./client/css/
COPY client/fonts/ ./client/fonts/
COPY client/images/ ./client/images/
COPY client/app/ ./client/app/
COPY assets/0_icon.png ./assets/0_icon.png
COPY index.html ./index.html
COPY version.json ./version.json
COPY client/manifests/PWA/manifest.json ./client/manifests/PWA/manifest.json

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy all files from builder
COPY --from=builder /app/ ./

# Create books directory
RUN mkdir -p /app/books

# Create .env file with production settings and generate random SESSION_SECRET
RUN echo "NODE_ENV=production" > /app/server/.env && \
    echo "SESSION_SECRET=$(tr -dc 'a-zA-Z0-9' < /dev/urandom | fold -w 64 | head -n 1)" >> /app/server/.env

# Expose port
EXPOSE 8866

# Set books directory as a volume
VOLUME ["/app/books"]

# Start command
CMD ["node", "server/app/app.js"]
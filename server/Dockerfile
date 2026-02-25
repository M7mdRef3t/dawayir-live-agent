# Stage 1: Build the React frontend
FROM node:20-slim AS client-build

WORKDIR /build/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-slim

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy server code
COPY server/ ./

# Copy built client into server's expected path
COPY --from=client-build /build/client/dist ./client/dist

EXPOSE 8080

CMD ["node", "index.js"]

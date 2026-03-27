FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN cd server && npm ci --production
RUN cd client && npm ci

# Copy source
COPY . .

# Build frontend
RUN cd client && npm run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/src/index.js"]

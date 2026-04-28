# Refine — single-stage build (debug-friendly)
FROM node:20-alpine

WORKDIR /app

# Tools
RUN apk add --no-cache curl

# Deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Source
COPY . .

# Build
ENV NODE_ENV=production
ENV CI=true
RUN npm run build

# Serve estático
RUN npm install -g serve

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

CMD ["serve", "-s", "dist", "-l", "80"]

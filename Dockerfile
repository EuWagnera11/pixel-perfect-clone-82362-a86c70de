# Refine — Vite + React production build
# Stage 1: build com bun (lock file é bun.lockb)

FROM oven/bun:1.1-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

# Stage 2: serve via nginx alpine — leve + rápido
FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache brotli && rm -rf /var/cache/apk/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health endpoint
RUN echo 'OK' > /usr/share/nginx/html/_health

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/_health || exit 1

CMD ["nginx", "-g", "daemon off;"]

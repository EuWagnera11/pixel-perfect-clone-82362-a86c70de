# Refine — bun build (low memory, fast install)
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=1024

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production=false

COPY . .
RUN bun run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN echo 'OK' > /usr/share/nginx/html/_health

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

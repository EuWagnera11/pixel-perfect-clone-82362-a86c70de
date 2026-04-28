# Refine — bun fresh resolve (lockfile fora de sync no repo)
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production

# Só package.json — bun resolve deps fresh (lockfile desatualizado)
COPY package.json ./
RUN bun install --production=false --no-progress

COPY . .
RUN bun run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN echo 'OK' > /usr/share/nginx/html/_health

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

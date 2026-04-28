# Refine — minimal build with low memory
FROM node:20-alpine AS builder

WORKDIR /app

# Use less memory during install/build
ENV NODE_OPTIONS=--max-old-space-size=1536
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_PROGRESS=false

COPY package.json package-lock.json ./
RUN npm ci --omit=optional

COPY . .
RUN npm run build && rm -rf node_modules src public

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN echo 'OK' > /usr/share/nginx/html/_health

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

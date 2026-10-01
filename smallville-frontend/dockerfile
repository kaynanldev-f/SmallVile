# Build
FROM node:20-alpine AS builder
RUN apk add --no-cache bash
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts --network-timeout 600000
COPY . .
RUN yarn build

# Production
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache bash curl
ENV NODE_ENV=production

# Standalone Output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Port
EXPOSE $PORT
CMD ["node", "server.js"]

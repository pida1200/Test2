FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json vitest.config.ts ./
COPY src ./src
COPY test ./test
RUN npm run build && npm test

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 homemcp && adduser -D -G homemcp -u 1001 homemcp
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && chown -R homemcp:homemcp /app
COPY --from=builder /app/dist ./dist
USER homemcp
ENV NODE_ENV=production
EXPOSE 8766
CMD ["node", "dist/index.js"]

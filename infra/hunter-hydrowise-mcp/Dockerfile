# Hunter Hydrawise MCP — https://github.com/skialpine/hunter-hydrowise-mcp
# Node 24+ required by upstream (engines.node).

FROM node:24-alpine AS builder
RUN apk add --no-cache git ca-certificates
WORKDIR /src
ARG HYDRAWISE_MCP_REPO=https://github.com/skialpine/hunter-hydrowise-mcp.git
ARG HYDRAWISE_MCP_REF=main
RUN git clone --depth 1 --branch "${HYDRAWISE_MCP_REF}" "${HYDRAWISE_MCP_REPO}" .
RUN npm ci && npm run build

FROM node:24-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 hydrowise && adduser -D -G hydrowise -u 1001 hydrowise
COPY --from=builder /src/package.json /src/package-lock.json ./
COPY --from=builder /src/dist ./dist
RUN npm ci --omit=dev && chown -R hydrowise:hydrowise /app
USER hydrowise
ENV NODE_ENV=production
EXPOSE 8765
CMD ["node", "dist/server.js"]

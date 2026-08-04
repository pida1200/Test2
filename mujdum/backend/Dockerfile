FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json /app/
COPY backend/package.json /app/backend/package.json
COPY frontend/package.json /app/frontend/package.json

RUN npm ci --workspaces --include-workspace-root

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json /app/
COPY --from=deps /app/node_modules /app/node_modules
COPY backend /app/backend

RUN npm -w @mujdum/backend run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/backend/dist /app/backend/dist
COPY backend/package.json /app/backend/package.json
COPY backend/migrations /app/backend/migrations
COPY backend/scripts /app/backend/scripts

EXPOSE 3001

CMD ["sh", "-c", "node /app/backend/dist/index.js"]


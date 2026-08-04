FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json /app/
COPY frontend/package.json /app/frontend/package.json
COPY backend/package.json /app/backend/package.json

RUN npm ci --workspaces --include-workspace-root

COPY frontend /app/frontend

RUN npm -w @mujdum/frontend run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80


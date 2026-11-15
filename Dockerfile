# Cloud Run: dist/ (Vite) và server-dist/ (esbuild từ server/index.ts) được dựng sẵn bằng `npm run build:cloudrun`.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force
COPY dist ./dist
COPY server-dist ./server-dist
CMD ["node", "server-dist/index.mjs"]

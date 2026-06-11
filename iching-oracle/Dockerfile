FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prod-server.mjs ./
COPY dist ./dist
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", "prod-server.mjs"]

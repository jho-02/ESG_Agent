FROM node:20-alpine

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --omit=dev

COPY frontend/ ./

ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:3100/healthz || exit 1

CMD ["npm", "start"]
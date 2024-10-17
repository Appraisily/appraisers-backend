# main-service/Dockerfile

FROM node:16-alpine

WORKDIR /app

COPY main-service/package*.json ./
RUN npm install --production

COPY main-service ./
COPY shared ./shared

# Comandos de depuración
RUN ls -la /app
RUN ls -la /app/shared

EXPOSE 8080

CMD ["node", "index.js"]

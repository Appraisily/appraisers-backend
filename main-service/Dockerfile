# main-service/Dockerfile

FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Cambiar temporalmente para invalidar cache
RUN echo "Construcción de depuración"

RUN ls -la /app

EXPOSE 8080

CMD ["node", "index.js"]

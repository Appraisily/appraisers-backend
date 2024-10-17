# main-service/Dockerfile

FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Añadir comando para listar archivos
RUN ls -la /app

EXPOSE 8080

CMD ["node", "index.js"]

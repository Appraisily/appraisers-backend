# Dockerfile

# Usar la versión LTS de Node.js
FROM node:16-alpine

# Crear y establecer el directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del código de la aplicación
COPY . .

# Exponer el puerto (Cloud Run espera el puerto 8080)
EXPOSE 8080

# Iniciar el servidor
CMD ["node", "index.js"]

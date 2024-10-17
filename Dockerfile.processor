# Dockerfile.processor

# Usar una versión de Node.js adecuada (la misma que el servicio principal)
FROM node:16-alpine

# Crear y establecer el directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del código de la aplicación
COPY . .

# Comando para iniciar el procesador
CMD ["node", "processor.js"]

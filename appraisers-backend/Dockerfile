# appraisers-backend/Dockerfile

FROM node:16-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias
COPY appraisers-backend/package*.json ./

# Instala las dependencias
RUN npm install --production

# Copia los archivos de appraisers-backend
COPY appraisers-backend ./

# Copia la carpeta shared dentro de /app/shared
COPY shared ./shared

# Comandos de depuración para verificar la copia de archivos
RUN ls -la /app
RUN ls -la /app/shared

# Expone el puerto en el que la aplicación escuchará
EXPOSE 8080

# Comando para ejecutar la aplicación
CMD ["node", "index.js"]

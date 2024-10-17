# main-service/Dockerfile

FROM node:16-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias
COPY main-service/package*.json ./

# Instala las dependencias
RUN npm install --production

# Copia los archivos de main-service
COPY main-service ./

# Copia la carpeta shared dentro de /app/shared
COPY shared ./shared

# Expone el puerto en el que la aplicación escuchará
EXPOSE 8080

# Comando para ejecutar la aplicación
CMD ["node", "index.js"]

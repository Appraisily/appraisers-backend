# processor-service/Dockerfile

FROM node:16-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias
COPY processor-service/package*.json ./

# Instala las dependencias
RUN npm install --production

# Copia los archivos de processor-service
COPY processor-service ./

# No es necesario exponer un puerto ya que este servicio no maneja solicitudes HTTP externas

# Copiar la carpeta shared si es necesario
COPY shared ./shared

# Comando para ejecutar el procesador
CMD ["node", "processor.js"]

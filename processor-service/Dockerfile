# processor-service/Dockerfile

FROM node:16-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias
COPY package*.json ./

# Instala las dependencias
RUN npm install --production

# Copia el resto de los archivos de la aplicación
COPY . .

# No es necesario exponer un puerto ya que este servicio no maneja solicitudes HTTP externas

# Comando para ejecutar el procesador
CMD ["node", "processor.js"]

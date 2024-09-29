# Use Node.js LTS version
FROM node:16-alpine

# Create and set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port (Cloud Run expects port 8080)
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]  # Replace 'index.js' with your main file if different

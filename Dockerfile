FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Expose port 8080
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
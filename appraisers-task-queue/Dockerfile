# appraisers-task-queue/Dockerfile

FROM node:16-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY appraisers-task-queue/package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY appraisers-task-queue ./

# Copy the shared directory
COPY shared ./shared

# Optional: Debugging - List files to verify
RUN ls -la /app
RUN ls -la /app/shared

# No need to expose a port if not handling HTTP requests

# Start the processor
CMD ["node", "processor.js"]

# Use Node 24 (Alpine for smaller image)
FROM node:24-alpine

# Create app directory
WORKDIR /app

# Install dependencies
# (We install dev deps too because we use tsx at runtime)
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Set environment
ENV NODE_ENV=production
# Cloud Run will inject PORT, but default to 8080
ENV PORT=8080

EXPOSE 8080

# Start the app
CMD ["npm", "run", "start"]

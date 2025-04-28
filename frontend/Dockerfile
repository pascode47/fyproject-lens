# Stage 1: Build the Angular application
# Use Node 18 based on @types/node dependency
FROM node:18-alpine AS build

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Increase memory limit for Node.js
ENV NODE_OPTIONS=--max-old-space-size=2048

# Build the application for production
# The output will be in /usr/src/app/dist/fyproject-lens/browser
RUN npm run build -- --configuration production

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built application artifacts from the 'build' stage
# Angular application builder output is in 'dist/<project-name>/browser'
COPY --from=build /usr/src/app/dist/fyproject-lens/browser /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for Nginx
EXPOSE 80

# Default command to start Nginx
CMD ["nginx", "-g", "daemon off;"]

# Use an official Node.js runtime as a parent image
# Using Node 20 LTS version
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install app dependencies
# Use --only=production if you don't need devDependencies
RUN npm install

# Bundle app source
COPY . .

# Make port 3000 available to the world outside this container
# Use the PORT environment variable if set, otherwise default to 3000
EXPOSE ${PORT:-3000}

# Define environment variable (optional, can be set via docker-compose)
# ENV PORT=3000
# ENV MONGODB_URI=your_mongodb_connection_string

# Command to run the application
CMD [ "node", "server.js" ]

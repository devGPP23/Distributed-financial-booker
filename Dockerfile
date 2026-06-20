FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install --production

# Bundle app source
COPY . .

# Expose port
EXPOSE 3000

# By default, start the web server (we can override this in Railway for the worker)
CMD [ "npm", "start" ]

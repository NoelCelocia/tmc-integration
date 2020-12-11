# API Dockerfile
FROM node:10
WORKDIR /usr/src/app
COPY package*.json ./

#
RUN npm install
COPY . .
EXPOSE 4102
CMD ["npm", "start"]

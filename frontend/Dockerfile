FROM node:latest as build
WORKDIR /app
COPY . .
RUN npm install
RUN npm install -g @angular/cli
RUN ng build --configuration=production


CMD node server.js

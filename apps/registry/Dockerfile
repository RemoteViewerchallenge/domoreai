FROM node:18-alpine

WORKDIR /app

COPY apps/registry/package.json .
RUN npm install

COPY apps/registry/index.js .

EXPOSE 8080

CMD ["npm", "start"]

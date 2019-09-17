FROM node:8.7.0-alpine

RUN mkdir -p /srv/app/gecko-upload-server
WORKDIR /srv/app/gecko-upload-server

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
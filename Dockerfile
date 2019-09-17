FROM node:8.7.0-alpine

RUN mkdir -p /srv/app/gecko-front
WORKDIR /srv/app/gecko-front

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
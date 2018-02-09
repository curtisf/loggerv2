FROM node:9

MAINTAINER Curtis Fowler

WORKDIR /logger

COPY package.json /logger/

RUN mkdir -p /logger/
COPY . /logger

RUN cd /logger/
RUN npm run-script build
RUN cd /logger/dist/
RUN npm i

CMD ["node", "/logger/dist/Logger.js", "--experimental-modules"]

# docker build -t attestation-suite .
# docker-compose -f docker-compose-indexer-btc.yaml up


FROM node:16-bullseye
WORKDIR /app/attestation-client
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "yarn.lock", "./"]
ENV DEBIAN_FRONTEND=noninteractive
RUN \
apt-get update && \
curl -L -o /tmp/mysql-apt-config.deb https://dev.mysql.com/get/mysql-apt-config_0.8.26-1_all.deb && \
apt-get install lsb-release -y && \
dpkg -i /tmp/mysql-apt-config.deb && \
apt-get update && \
apt-get -y install mysql-client && \
yarn install --frozen-lockfile
COPY . .
RUN yarn c && yarn build
EXPOSE 3000
# RUN chown -R node /app/attestation-client
RUN mkdir -p /app/attestation-client/logs && chown -R node /app/attestation-client/logs
USER node

ENV NODE_ENV=production
COPY ["package.json", "yarn.lock", "./"]
RUN yarn install --frozen-lockfile



FROM nodemodules as compile
WORKDIR /app

ENV NODE_ENV=development
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn run compile && yarn build


FROM alpine as mysqldeb
WORKDIR /app

ARG MYSQL_DEB_CHECKSUM=26441c08ccc4b32ee8e2720319022436efb6b93a9bdca0fd9b4df163000a8e7d
ARG MYSQL_DEB_FILENAME=mysql-apt-config_0.8.24-1_all.deb

ENV MYSQL_DEB_CHECKSUM=$MYSQL_DEB_CHECKSUM
ENV MYSQL_DEB_FILENAME=$MYSQL_DEB_FILENAME

RUN apk add wget && \
    wget -O "/app/${MYSQL_DEB_FILENAME}" "https://dev.mysql.com/get/${MYSQL_DEB_FILENAME}" && \
    sha256sum "/app/${MYSQL_DEB_FILENAME}" && \
    echo "${MYSQL_DEB_CHECKSUM}  /app/${MYSQL_DEB_FILENAME}" | sha256sum -c -




FROM node:16

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV PATH="${PATH}:/app/docker/scripts"
ARG MYSQL_DEB_FILENAME=mysql-apt-config_0.8.24-1_all.deb

RUN mkdir -p /app/logs && chown -R node /app/logs

RUN apt-get update && \
    apt-get install lsb-release -y

COPY --from=mysqldeb "/app/${MYSQL_DEB_FILENAME}" "/tmp/${MYSQL_DEB_FILENAME}"
RUN dpkg -i /tmp/mysql-apt-config_0.8.24-1_all.deb && \
    rm "/tmp/${MYSQL_DEB_FILENAME}" && \
    apt-get update && \
    apt-get -y install mysql-client


COPY --from=nodemodules /app/node_modules /app/node_modules
COPY --from=compile /app/dist /app/dist
COPY ./docker/scripts ./docker/scripts
COPY ./src ./src

USER node
EXPOSE 3000

ENTRYPOINT [ "/app/docker/scripts/entrypoint.sh" ]
CMD [ "indexer" ]


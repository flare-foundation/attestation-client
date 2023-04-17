# docker build -t attestation-suite .
# docker-compose -f docker-compose-indexer-btc.yaml up


FROM node:16
WORKDIR /app/attestation-client
COPY ["package.json", "yarn.lock", "./"]
ENV DEBIAN_FRONTEND=noninteractive
RUN \
apt-get update && \
curl -L -o /tmp/mysql-apt-config_0.8.24-1_all.deb https://dev.mysql.com/get/mysql-apt-config_0.8.24-1_all.deb && \
apt-get install lsb-release -y && \
dpkg -i /tmp/mysql-apt-config_0.8.24-1_all.deb && \
apt-get update && \
apt-get -y install mysql-client && \
yarn install --frozen-lockfile
COPY . .
RUN yarn c && yarn build
EXPOSE 3000
# RUN chown -R node /app/attestation-client
RUN mkdir -p /app/attestation-client/logs && chown -R node /app/attestation-client/logs
USER node

ENV PATH="${PATH}:/app/attestation-client/docker/scripts"
ENV NODE_ENV=production

ENTRYPOINT [ "/app/attestation-client/docker/scripts/entrypoint.sh" ]
CMD [ "indexer" ]


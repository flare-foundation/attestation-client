#!/bin/bash
source ./scripts/install-config.sh

export LOCAL_DIR=$CURRENT_DIR

export FRONTEND_NAME=atestation-fe-public

echo -e "${GREENBOLD}Installing frontend${NC}"

cd ..

rm -rf $FRONTEND_NAME

git clone https://git.aflabs.org/Avbreht/$FRONTEND_NAME.git


cd $LOCAL_DIR

yarn ts-node lib/install/install-file.ts -i ./scripts/files/frontend.env -o ../$FRONTEND_NAME/.env

cd ../$FRONTEND_NAME

# todo create .env

sudo docker build -t attestation-front-end -f docker/production/Dockerfile .
sudo docker-compose -f docker/production/docker-compose.yaml --env-file .env up -d

cd $LOCAL_DIR
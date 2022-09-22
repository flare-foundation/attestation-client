#!/bin/bash
source ./scripts/install-config.sh

export LOCAL_DIR=$CURRENT_DIR

echo -e "${GREENBOLD}Installing frontend${NC}"

cd ..

git clone https://git.aflabs.org/Avbreht/atestation-fe-public.git


cd $LOCAL_DIR

yarn ts-node lib/install/install-file.ts -i ./scripts/files/frontend.env -o ../attestation_front_end/.env

cd ../attestation_front_end

# todo create .env

sudo docker build -t attestation-front-end -f docker/production/Dockerfile .
sudo docker-compose -f docker/production/docker-compose.yaml --env-file .env up -d

cd $LOCAL_DIR
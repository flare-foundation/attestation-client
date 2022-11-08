#!/bin/bash

source ./scripts/install-config.sh

source .config.secret.sh2

echo -e "${GREENBOLD}Installing testnet nodes${NC}"

export LOCAL_DIR=$(pwd)

cd /opt
#sudo git clone https://github.com/zelje/flare-connected-chains-docker.git
sudo git clone https://github.com/flare-foundation/connected-chains-docker.git

cd connected-chains-docker/
git config --global --add safe.directory /opt/connected-chains-docker
#sudo git checkout testnets

sudo ./install.sh testnet $SECRET_NODES_TESTNET
sudo docker-compose -f docker-compose-testnet.yml up -d

sudo ./algorand-catchup.sh

echo -e "${GREENBOLD}testnet nodes installed${NC}"

cd $LOCAL_DIR

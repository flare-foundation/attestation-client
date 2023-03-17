#!/bin/bash

# Install test-net nodes for ripple, bitcoin and dogecoin.
# Please refer to [docs/install/direct-installation.md] for more details.


source ./scripts/direct-install/install-config.sh

echo -e "${GREENBOLD}Installing testnet nodes${NC}"

export LOCAL_DIR=$(pwd)

cd /opt
sudo git clone https://github.com/flare-foundation/connected-chains-docker.git

cd connected-chains-docker/
git config --global --add safe.directory /opt/connected-chains-docker
#sudo git checkout testnets

cd $LOCAL_DIR
env CREDENTIALS_KEY_FILE=credentials.prepared/btc-indexer-verifier/credentials.key yarn ts-node src/install/secureCommand.ts -a installNodesTestNet -f "/opt/connected-chains-docker" -c credentials.prepared/btc-indexer-verifier

cd /opt/connected-chains-docker
sudo docker-compose -f docker-compose-testnet.yml up -d

sudo ./algorand-catchup.sh

echo -e "${GREENBOLD}testnet nodes installed${NC}"

cd $LOCAL_DIR

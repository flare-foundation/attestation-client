#!/bin/bash
source ./scripts/install-config.sh

# install dependencies and compile 1st (needed to crate initial credentials)
source ./scripts/install-dependencies.sh

source ~/.profile 
source ~/.nvm/nvm.sh

# compile
echo -e "${REDBOLD}[3] ${GREENBOLD}Compile...${NC}"
bash ./scripts/compile.sh


# prepare initial credentials
yarn ts-node lib/install/install-file.ts -i .config.secret.sh -o .config.secret.sh2 -p false

source ./scripts/install-check.sh

# install services
sudo loginctl enable-linger ubuntu
bash ./scripts/install-services.sh

# prepare configurations
source ./scripts/initialize-config.sh
yarn ts-node lib/install/install.ts ../attestation-suite-config/

# install testnet nodes
if $INSTALL_NODES_TESTNET; then
   source ./scripts/install-nodes-testnet.sh
fi

# enable local mysql
if $INSTALL_MYSQL; then
    source ./scripts/install-local-mysql.sh
fi

# install frontend
if $INSTALL_FRONTEND; then
    source ./scripts/install-certbot.sh
    source ./scripts/install-nginx.sh
    source ./scripts/install-frontend.sh
fi

# update config
source ./scripts/update-config.sh

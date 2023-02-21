#!/bin/bash
#source ./scripts/install-credentials.sh

source ~/.profile 
source ~/.nvm/nvm.sh

# compile
echo -e "${REDBOLD}[3] ${GREENBOLD}Compile...${NC}"
bash ./scripts/compile.sh

# install services
sudo loginctl enable-linger ubuntu
bash ./scripts/install-services.sh

# prepare configurations
#source ./scripts/initialize-config.sh

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
#source ./scripts/update-config.sh

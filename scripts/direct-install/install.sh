#!/bin/bash

# Main direct-install script.
# It installs Attestation Suite services and selected modules.
# Please refer to [docs/install/direct-installation.md] for more details.


source ~/.profile 
source ~/.nvm/nvm.sh

# compile
echo -e "${REDBOLD}[3] ${GREENBOLD}Compile...${NC}"
bash ./scripts/compile.sh

# install services
sudo loginctl enable-linger ubuntu
bash ./scripts/direct-install/install-services.sh

# install testnet nodes
if $INSTALL_NODES_TESTNET; then
   source ./scripts/direct-install/install-nodes-testnet.sh
fi

# enable local mysql
if $INSTALL_MYSQL; then
    source ./scripts/direct-install/install-mysql.sh
fi

# install frontend
if $INSTALL_FRONTEND; then
    source ./scripts/direct-install/install-certbot.sh
    source ./scripts/direct-install/install-nginx.sh
fi
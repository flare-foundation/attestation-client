#!/bin/bash
source ./scripts/install-config.sh

source ~/.profile 
source ~/.nvm/nvm.sh

# compile
echo -e "${GREENBOLD}Update frontend${NC}"

# install frontend
if $INSTALL_FRONTEND; then
    source ./scripts/install-certbot.sh
    source ./scripts/install-nginx.sh
    source ./scripts/install-frontend.sh
fi
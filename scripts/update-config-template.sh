#!/bin/bash
source ./scripts/install-config.sh

export CONFIGDIR_TEMPLATES_SRC=./configs/.install/templates
export CONFIGDIR_TEMPLATES_DEST=../attestation-suite-config/templates

# copy configs templates to destination folder (initialize-config.sh must have been called before so that folders are created)
echo -e "${GREENBOLD}Update configurations templates...${NC}"

cp -v -a -u $CONFIGDIR_TEMPLATES_SRC/. $CONFIGDIR_TEMPLATES_DEST/.

bash ./scripts/update-config.sh
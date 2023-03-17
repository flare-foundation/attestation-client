#!/bin/bash

# Copy systemd service files and register them.
# Please refer to [docs/install/direct-installation.md] for more details.

source ./scripts/direct-install/install-config.sh

# copy services
echo -e "${REDBOLD}[1] ${GREENBOLD}Copying services...${NC}"
mkdir -p ~/.config/systemd/user
cp ./scripts/direct-install/services/*.service ~/.config/systemd/user

# enable services
echo -e "${REDBOLD}[2] ${GREENBOLD}Installing services...${NC}"

systemctl --user daemon-reload

if $ENABLE_INDEXER; then
    systemctl --user enable indexer-xrp.service
    systemctl --user enable indexer-btc.service
    systemctl --user enable indexer-doge.service
fi

if $INSTALL_VERIFIER; then
    systemctl --user enable verifier-xrp.service
    systemctl --user enable verifier-btc.service
    systemctl --user enable verifier-doge.service
fi

if $ENABLE_MONITOR; then
    systemctl --user enable attester-alerts
fi

if $INSTALL_FLARE; then
    systemctl --user enable flare-attester-client.service
    systemctl --user enable flare-webserver.service
fi

if $INSTALL_SONGBIRD; then
    systemctl --user enable songbird-attester-client.service
    systemctl --user enable songbird-webserver.service
fi

if $INSTALL_COSTON; then
    systemctl --user enable coston-attester-client.service
    systemctl --user enable coston-webserver.service
fi

if $INSTALL_COSTON2; then
    systemctl --user enable coston2-attester-client.service
    systemctl --user enable coston2-webserver.service
fi
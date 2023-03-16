#!/bin/bash

# Install certbot for nginx.
# Please refer to [docs/install/direct-installation.md] for more details.

source ./scripts/direct-install/install-config.sh

echo -e "${GREENBOLD}Installing CertBot${NC}"

sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo apt install certbot -y
sudo certbot certonly --standalone -d $HOSTNAME -m $CERT_EMAIL --agree-tos
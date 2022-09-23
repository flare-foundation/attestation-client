#!/bin/bash

source ./scripts/install-config.sh

source .config.secret.sh2

echo -e "${GREENBOLD}Installing CertBot${NC}"

sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo snap install --classic certbot
sudo certbot certonly --standalone -d $HOSTNAME -m $CERT_EMAIL --agree-tos

#!/bin/bash

source ./scripts/install-config.sh

source .config.secret.sh2

echo -e "${GREENBOLD}Installing nginX${NC}"

sudo apt install nginx

sudo yarn ts-node lib/install/install-file.ts -i ./scripts/files/nginx.default -o /etc/nginx/sites-available/default

sudo service nginx restart

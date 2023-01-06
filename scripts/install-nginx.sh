#!/bin/bash

source ./scripts/install-config.sh

echo -e "${GREENBOLD}Installing nginX${NC}"

sudo apt install nginx -y

yarn ts-node src/install/install-file.ts -i ./scripts/files/nginx.default -o nginX.default
sudo cp nginX.default /etc/nginx/sites-available/default

sudo service nginx restart

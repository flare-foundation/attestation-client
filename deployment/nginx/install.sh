#!/bin/bash

domain_name="$1"
email="$2"

docker-compose -f docker-compose-nginx-init.yaml -p nginx up -d
docker-compose -f docker-compose-nginx.yaml run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ --non-interactive --agree-tos --email "$email" -d "$domain_name"
docker-compose -f docker-compose-nginx-init.yaml -p nginx down

docker-compose -f docker-compose-nginx.yaml -p nginx up -d

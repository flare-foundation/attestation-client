#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

echo "updating attestation-client main container"

docker stop attestation-client-client
docker container rm attestation-client-client

docker stop attestation-client-webserver
docker container rm attestation-client-webserver

docker volume prune -f

./start.sh
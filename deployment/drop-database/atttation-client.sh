#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

echo "drop attestation-client database container"

docker stop attestation-client-database
docker container rm attestation-client-database

docker volume prune -f

cd attestation-client

./start.sh

cd ..
#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

echo "updating monitor main container"

docker stop monitor
docker container rm monitor
docker volume prune -f

./start.sh
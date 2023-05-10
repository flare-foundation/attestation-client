#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

echo "updating stats main container"

docker stop stats   
docker container rm stats
docker volume prune -f

./start.sh
#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

docker stop `docker ps -qa`
docker system prune --volumes --all
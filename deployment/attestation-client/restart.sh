#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

echo "restarting attestation-client main container"

docker restart attestation-client-client
docker restart attestation-client-webserver

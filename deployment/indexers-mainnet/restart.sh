#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

chain="$1"

echo "restarting $chain indexer main container"

docker restart indexer-$chain-indexer
docker restart indexer-$chain-verification-server
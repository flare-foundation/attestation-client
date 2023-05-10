#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

chain="$1"

echo "updating $chain indexer main container"

docker stop indexer-$chain-indexer
docker container rm indexer-$chain-indexer

docker stop indexer-$chain-verification-server
docker container rm indexer-$chain-verification-server

docker volume prune -f

./start.sh $chain
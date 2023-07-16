#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

NETWORK="$1"

CHAIN="$2"

if [[ $NETWORK == mainnet || $NETWORK == testnet ]] ; then

    echo "drop indexer $CHAIN database container"

    docker stop indexer-$CHAIN-database
    docker container rm indexer-$CHAIN-database

    docker volume prune -f

    cd indexers-$NETWORK

    ./start.sh $CHAIN

    cd ..

else
  echo "Invalid network: '$NETWORK' ('mainnet' and 'testnet' supported)."
fi

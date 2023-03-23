#!/bin/bash

NETWORK="$1"

if [[ $NETWORK == mainnet || $NETWORK == testnet ]] ; then
   echo "Starting all dockers for: $NETWORK"
   cd indexers-$NETWORK

   docker-compose -f docker-compose-indexer-xrp.yaml -p indexer-xrp up -d
   docker-compose -f docker-compose-indexer-btc.yaml -p indexer-btc up -d
   docker-compose -f docker-compose-indexer-doge.yaml -p indexer-doge up -d 

   cd ../attestation-client
   docker-compose -f docker-compose-attestation-client.yaml up -d

   cd ../monitor
   docker-compose -f docker-compose-monitor.yaml up -d

   cd ..
else
  echo "Invalid network: '$NETWORK' ('mainnet' and 'testnet' supported)."
fi


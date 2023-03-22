#!/bin/bash

NETWORK="$1"

if [[ $NETWORK == mainnet || $NETWORK == testnet ]] ; then
   echo "Stopping all dockers for: $NETWORK"
   cd indexers-$NETWORK

   docker-compose -f docker-compose-indexer-xrp.yaml -p indexer-xrp down
   docker-compose -f docker-compose-indexer-btc.yaml -p indexer-btc down 
   docker-compose -f docker-compose-indexer-doge.yaml -p indexer-doge down 

   cd ../attestation-client
   docker-compose -f docker-compose-attestation-client.yaml down

   cd ../monitor
   docker-compose -f docker-compose-monitor.yaml down

   cd ..

else
  echo "Invalid network: '$NETWORK' ('mainnet' and 'testnet' supported)."
fi

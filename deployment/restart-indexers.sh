#!/bin/bash

NETWORK="$1"

if [[ $NETWORK == mainnet || $NETWORK == testnet ]] ; then
   echo "Restarting indexer dockers for: $NETWORK"
   cd indexers-$NETWORK

   docker-compose -f docker-compose-indexer-xrp.yaml -p indexer-xrp stop indexer 
   docker-compose -f docker-compose-indexer-btc.yaml -p indexer-btc stop indexer 
   docker-compose -f docker-compose-indexer-doge.yaml -p indexer-doge stop indexer 

   docker-compose -f docker-compose-indexer-xrp.yaml -p indexer-xrp start
   docker-compose -f docker-compose-indexer-btc.yaml -p indexer-btc start 
   docker-compose -f docker-compose-indexer-doge.yaml -p indexer-doge start 
else
  echo "Invalid network: '$NETWORK' ('mainnet' and 'testnet' supported)."
fi





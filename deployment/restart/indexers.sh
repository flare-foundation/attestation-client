#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

NETWORK="$1"

if [[ $NETWORK == mainnet || $NETWORK == testnet ]] ; then
   echo "restart attestation-suite dockers for: $NETWORK"

   cd indexers-$NETWORK

   ./restart.sh xrp
   ./restart.sh btc
   ./restart.sh doge
      
   cd ..
else
  echo "Invalid network: '$NETWORK' ('mainnet' and 'testnet' supported)."
fi

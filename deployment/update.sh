#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

NETWORK="$1"

if [[ $NETWORK == mainnet || $NETWORK == testnet ]] ; then
   
   echo "updating attestation suite ($NETWORK)"

   cd ..


   echo "updating repository..."
   git pull

   echo "building new attestation-suite image..."
   docker build -t attestation-suite . --no-cache

   cd deployment   
   
   echo "updating attestation suite containers..."
   cd indexers-$NETWORK

   ./update.sh xrp
   ./update.sh btc
   ./update.sh doge

   cd ../attestation-client
   ./update.sh
   
   cd ../monitor
   ./update.sh
   
   cd ../stats
   ./update.sh
   
   cd ..
else
  echo "Invalid network: '$NETWORK' ('mainnet' and 'testnet' supported)."
fi

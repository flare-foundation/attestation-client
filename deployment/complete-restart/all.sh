#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

NETWORK="$1"

if [[ $NETWORK == mainnet || $NETWORK == testnet ]] ; then
   ../stop-all.sh $NETWORK
   ../start-all.sh $NETWORK
else
  echo "Invalid network: '$NETWORK' ('mainnet' and 'testnet' supported)."
fi

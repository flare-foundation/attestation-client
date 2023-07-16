#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

NETWORK="$1"

if [[ $NETWORK == mainnet || $NETWORK == testnet ]] ; then

    echo "drop all indexers database container"

   ./drop-database/indexer.sh $NETWORK xrp
   ./drop-database/indexer.sh $NETWORK btc
   ./drop-database/indexer.sh $NETWORK doge

else
  echo "Invalid network: '$NETWORK' ('mainnet' and 'testnet' supported)."
fi

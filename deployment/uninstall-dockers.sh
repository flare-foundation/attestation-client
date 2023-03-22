#!/bin/bash

NETWORK="$1"

if [[ $NETWORK == mainnet || $NETWORK == testnet ]] ; then
   echo "Uninstalling dockers for: $NETWORK"
   cd indexers-$NETWORK

   ./uninstall.sh xrp
   ./uninstall.sh btc
   ./uninstall.sh doge

   cd ../attestation-client
   ./uninstall.sh
   
   cd ../monitor
   ./uninstall.sh
   
   cd ..
else
  echo "Invalid network: '$NETWORK' ('mainnet' and 'testnet' supported)."
fi

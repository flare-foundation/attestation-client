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
else
  echo "Invalid network: '$NETWORK'"
fi

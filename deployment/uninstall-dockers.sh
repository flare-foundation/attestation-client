#!/bin/bash

cd indexers-testnet

./uninstall.sh xrp
./uninstall.sh btc
./uninstall.sh doge

cd ../attestation-client

./uninstall.sh

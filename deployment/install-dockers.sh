#!/bin/bash

cd indexers-testnet

./install.sh xrp ../node-configs/testnet/ripple/
./install.sh btc ../node-configs/testnet/bitcoin/
./install.sh doge ../node-configs/testnet/dogecoin/

cd ../attestation-client

./install.sh

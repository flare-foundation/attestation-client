#!/bin/bash

cd indexers-testnet

docker-compose -f docker-compose-indexer-xrp.yaml -p indexer-xrp down
docker-compose -f docker-compose-indexer-btc.yaml -p indexer-btc down 
docker-compose -f docker-compose-indexer-doge.yaml -p indexer-doge down 

cd ../attestation-client

docker-compose -f docker-compose-attestation-client.yaml down

cd ..

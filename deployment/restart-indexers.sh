#!/bin/bash

cd indexers-testnet

docker-compose -f docker-compose-indexer-xrp.yaml -p indexer-xrp stop indexer 
docker-compose -f docker-compose-indexer-btc.yaml -p indexer-btc stop indexer 
docker-compose -f docker-compose-indexer-doge.yaml -p indexer-doge stop indexer 

docker-compose -f docker-compose-indexer-xrp.yaml -p indexer-xrp start
docker-compose -f docker-compose-indexer-btc.yaml -p indexer-btc start 
docker-compose -f docker-compose-indexer-doge.yaml -p indexer-doge start 


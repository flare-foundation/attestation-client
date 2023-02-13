
cd indexers-testnet

docker-compose -f docker-compose-indexer-xrp.yaml -p indexer-xrp up -d
docker-compose -f docker-compose-indexer-btc.yaml -p indexer-btc up -d
docker-compose -f docker-compose-indexer-doge.yaml -p indexer-doge up -d 

cd ../attestation-client

docker-compose -f docker-compose-attestation-client.yaml up -d


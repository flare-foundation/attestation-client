#!/bin/bash

chain="$1"

docker-compose -f docker-compose-indexer-$chain.yaml -p indexer-$chain down
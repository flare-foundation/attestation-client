#!/bin/bash

chain="$1"
spammer="$2"

if [[ $spammer == spammer ]] ; then
   docker-compose -f docker-compose-indexer-$chain.yaml -p indexer-$chain stop spammer 
else
   docker-compose -f docker-compose-indexer-$chain.yaml -p indexer-$chain down
fi
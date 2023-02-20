#!/bin/bash

chain="$1"

if [[ -z $2 ]] ; then
   docker-compose -f docker-compose-indexer-$chain.yaml -p indexer-$chain down   
else
   docker-compose -f docker-compose-indexer-$chain.yaml -p indexer-$chain stop "${@:2}"
fi
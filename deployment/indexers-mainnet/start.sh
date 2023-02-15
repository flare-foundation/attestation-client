#!/bin/bash

chain="$1"
spammer="$2"

if [[ $spammer == spammer ]] ; then
   docker-compose -f docker-compose-indexer-$chain.yaml -p indexer-$chain --profile spammer up -d 
else
   docker-compose -f docker-compose-indexer-$chain.yaml -p indexer-$chain up -d
fi
#!/bin/bash

docker-compose -f docker-compose-indexer-$chain.yaml -p indexer-$chain logs -f $1
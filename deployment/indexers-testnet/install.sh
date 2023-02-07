#!/bin/bash

chain="$1"
config_dir="$2"

docker compose -f docker-compose-indexer-$chain.yaml -p indexer-$chain up -d indexer database verification-server

if [[ "$chain" != "xrp" ]]; then
	while [[ -z "$password" ]]; do
		password=$(docker exec -e LOG_SILENT=true indexer-$chain-verification-server yarn --silent ts-node src/install/getSecureValue.ts -e ${chain^^}Password)
	done

	echo "password: $password"

	cd "$config_dir"
	./rpcauth.py admin "$password"

	cd -
fi

docker compose -f docker-compose-indexer-$chain.yaml -p indexer-$chain up -d

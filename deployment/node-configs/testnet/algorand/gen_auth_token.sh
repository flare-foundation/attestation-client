#!/bin/bash

PASS="${1:-}"

if [[ ! -f algod.token ]]; then
    secret=$PASS
    if [[ ${#PASS} -eq 0 ]]; then
	    secret=$(openssl rand -hex 32)
    fi
    echo $secret > algod.token
    echo "Your generated algorand api key is : $secret"
else
    echo "algod.token already exists, skipping secret generation"
fi

#!/bin/bash

docker-compose -f docker-compose-attestation-client.yaml -p attestation-client up -d $@

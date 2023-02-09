#!/bin/bash

cd attestation-client

docker-compose -f docker-compose-attestation-client.yaml -p attestation-client stop attestation-client-client

docker-compose -f docker-compose-attestation-client.yaml -p attestation-client start

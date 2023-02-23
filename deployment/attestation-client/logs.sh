#!/bin/bash

docker-compose -f docker-compose-attestation-client.yaml -p attestation-client logs -f --tail=1000 $1

#!/bin/bash

if [[ -z "$1" ]] ; then
   docker-compose -f docker-compose-attestation-client.yaml -p attestation-client down   
else
   docker-compose -f docker-compose-attestation-client.yaml -p attestation-client stop $@
fi
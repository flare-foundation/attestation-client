#!/bin/bash

# documented in [./docs/installation/MaintenanceScripts.md]

NETWORK="$1"

./restart/indexers.sh $NETWORK

./restart/attestation-client.sh
#!/bin/bash
source ./scripts/install-config.sh

yarn ts-node src/install/secureConfigurations.ts -i credentials -o credentials.prepared



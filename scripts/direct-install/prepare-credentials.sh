#!/bin/bash
source ./scripts/direct-install/install-config.sh

yarn ts-node src/install/secureConfigurations.ts -i credentials -o credentials.prepared



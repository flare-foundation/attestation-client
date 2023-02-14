#!/bin/bash
source ./scripts/install-config.sh

yarn ts-node src/install/secureConfigurations.ts -i credentials -o credentials.prepared

# restart all services
source ./scripts/services-restart-all.sh


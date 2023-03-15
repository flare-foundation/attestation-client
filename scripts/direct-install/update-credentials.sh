#!/bin/bash
source ./scripts/direct-install/install-config.sh

yarn ts-node src/direct-install/install/secureConfigurations.ts -i credentials -o credentials.prepared

# restart all services
source ./scripts/direct-install/services-restart-all.sh


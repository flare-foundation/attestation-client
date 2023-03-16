#!/bin/bash

# Update credential and restart services.
# Please refer to [docs/install/direct-installation.md] for more details.

yarn ts-node src/direct-install/install/secureConfigurations.ts -i credentials -o credentials.prepared

# restart all services
source ./scripts/direct-install/services-restart-all.sh


#!/bin/bash

# Prepare credential packgares from folder `credentials` into `credentials.prepared`.
# Please refer to [docs/install/direct-installation.md] for more details.


source ./scripts/direct-install/install-config.sh

yarn ts-node src/install/secureConfigurations.ts -i credentials -o credentials.prepared



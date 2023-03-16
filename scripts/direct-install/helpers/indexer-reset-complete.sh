#!/bin/bash

# Reset all indexers databases.

bash ./scripts/services-stop-all.sh
CONFIG_PATH=.secure node dist/src/runIndexer -a ALGO -r RESET_COMPLETE
bash ./scripts/services-restart-all.sh

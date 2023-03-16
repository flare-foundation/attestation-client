#!/bin/bash

# Pull new code from git, compile and restart services.
# Please refer to [docs/install/direct-installation.md] for more details.

#rm -f yarn.lock
git pull
bash ./scripts/compile.sh
bash ./scripts/direct-install/services-restart-all.sh
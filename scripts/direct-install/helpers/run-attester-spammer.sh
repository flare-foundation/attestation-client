#!/bin/bash

# Start attestations spammer. This is for testing purposes only.

# Path to config json. By default it seeks file named config.json in the root folder
CONFIG_PATH=${1:-./configs/config.json}

# Compile typescript
# yarn tsc

# Run DataProvider
# node dist/src/spammer/attestation-spammer.js
yarn ts-node src/spammer/attestation-spammer.ts
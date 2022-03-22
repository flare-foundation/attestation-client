# Path to config json. By default it seeks file named config.json in the root folder
CONFIG_PATH=${1:-./configs/config.json}

# Compile typescript
yarn tsc

# Run DataProvider
#yarn ts-node lib/spammer/attestation-spammer.ts \
node dist/lib/spammer/attestation-spammer.js \
    -c XRP \
    -r http://127.0.0.1:9650/ext/bc/C/rpc \
    -a artifacts/contracts/StateConnector.sol/StateConnector.json \
    -t $(cat .stateconnector-address) \
    -b 1 \
    -o 1 \
    -f 1 \
    -d 500 \
    -l XRP

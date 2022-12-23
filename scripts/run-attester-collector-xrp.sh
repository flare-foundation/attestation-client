# Path to config json. By default it seeks file named config.json in the root folder
CONFIG_PATH=${1:-./configs/config.json}

# Compile typescript
yarn tsc

# Run DataProvider
# node dist/src/spammer/attestation-spammer.js \
yarn ts-node src/spammer/attestation-collector.ts \
    -c XRP \
    -r http://127.0.0.1:9650/ext/bc/C/rpc \
    -a artifacts/contracts/StateConnector.sol/StateConnector.json \
    -t $(cat .stateconnector-address) \
    -u https://xrplcluster.com \
    -b 1 \
    -o 1 \
    -f 1 \
    -w 1000 \
    -d 10000 \
    -l XRP

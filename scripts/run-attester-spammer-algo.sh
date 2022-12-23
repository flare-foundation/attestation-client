# Path to config json. By default it seeks file named config.json in the root folder
CONFIG_PATH=${1:-./configs/config.json}

# Compile typescript
yarn tsc

# Run DataProvider
# node dist/src/spammer/attestation-spammer.js \
yarn ts-node src/spammer/attestation-spammer.ts \
    -c ALGO \
    -r http://127.0.0.1:9650/ext/bc/C/rpc \
    -a artifacts/contracts/StateConnector.sol/StateConnector.json \
    -t $(cat .stateconnector-address) \
    -u http://testnode3.c.aflabs.net:4001/ \
    -h 7f90419ceab8fde42b2bd50c44ed21c0aefebc614f73b27619549f366b060a14
    -i http://testnode3.c.aflabs.net:8980/ \
    -j aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddd
    -b 1 \
    -o 10 \
    -f 1 \
    -w 1000 \
    -d 2000 \
    -l ALGO

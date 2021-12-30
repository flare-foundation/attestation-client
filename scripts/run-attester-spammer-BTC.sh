# Path to config json. By default it seeks file named config.json in the root folder
CONFIG_PATH=${1:-./configs/config.json}

# Compile typescript
# yarn tsc

# Run DataProvider
# node dist/scripts/attestation-spammer.js
yarn ts-node scripts/attestation-spammer.ts \
    -c BTC \
    -r http://127.0.0.1:8545 \
    -k 0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122 \
    -a artifacts/contracts/StateConnector.sol/StateConnector.json \
    -t 0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F \
    -u https://testnode2.c.aflabs.net/btc/ \
    -s rpcuser \
    -p rpcpass \
    -f 6 \
    -w 1000 \
    -d 500 \
    -l BTC
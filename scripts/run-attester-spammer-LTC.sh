# Path to config json. By default it seeks file named config.json in the root folder
CONFIG_PATH=${1:-./configs/config.json}

# Compile typescript
# yarn tsc

# Run DataProvider
# node dist/scripts/attestation-spammer.js
yarn ts-node scripts/attestation-spammer.ts \
    -c LTC \
    -r http://127.0.0.1:8545 \
    -k 0xee9d129c1997549ee09c0757af5939b2483d80ad649a0eda68e8b0357ad11131 \
    -a artifacts/contracts/StateConnector.sol/StateConnector.json \
    -t 0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F \
    -u https://testnode2.c.aflabs.net/ltc/ \
    -s rpcuser \
    -p rpcpass \
    -f 6 \
    -w 1000 \
    -d 500 \
    -l LTC

# Path to config json. By default it seeks file named config.json in the root folder
CONFIG_PATH=${1:-./configs/config.json}

# Compile typescript
# yarn tsc

# Run DataProvider
# node dist/scripts/attestation-spammer.js
yarn ts-node scripts/attestation-spammer.ts \
    -c DOGE \
    -r http://127.0.0.1:8545 \
    -k 0x87630b2d1de0fbd5044eb6891b3d9d98c34c8d310c852f98550ba774480e47cc \
    -a artifacts/contracts/StateConnector.sol/StateConnector.json \
    -t 0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F \
    -u https://testnode2.c.aflabs.net/doge/ \
    -s rpcuser \
    -p rpcpass \
    -f 6 \
    -w 1000 \
    -d 500 \
    -l DOGE

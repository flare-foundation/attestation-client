# Path to config json. By default it seeks file named config.json in the root folder
CONFIG_PATH=${1:-./configs/config.json}

# Compile typescript
# yarn tsc

# Run DataProvider
# node dist/scripts/attestation-spammer.js
yarn ts-node scripts/attestation-spammer.ts \
    -c XRP \
    -r http://127.0.0.1:8545 \
    -k 0x23c601ae397441f3ef6f1075dcb0031ff17fb079837beadaf3c84d96c6f3e569 \
    -a artifacts/contracts/StateConnector.sol/StateConnector.json \
    -t 0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F \
    -u https://xrplcluster.com \
    -f 1 \
    -w 1000 \
    -d 500 \
    -l XRP

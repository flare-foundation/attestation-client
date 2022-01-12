# Path to config json. By default it seeks file named config.json in the root folder
CONFIG_PATH=${1:-./configs/config.json}

# Compile typescript
# yarn tsc

# Run DataProvider
# node dist/scripts/attestation-spammer.js
yarn ts-node scripts/attestation-spammer.ts \
    -c BTC \
    -r http://127.0.0.1:9650/ext/bc/C/rpc \
    -a artifacts/contracts/StateConnector.sol/StateConnector.json \
    -t $(cat .stateconnector-address) \
    -u https://bitcoin.flare.network/ \
    -s flareadmin \
    -p mcaeEGn6CxYt49XIEYemAB-zSfu38fYEt5dV8zFmGo4= \
    -b 100 \
    -o 1 \
    -f 6 \
    -w 1000 \
    -d 500 \
    -l BTC

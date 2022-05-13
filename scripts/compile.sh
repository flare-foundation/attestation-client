export CURRENT_DIR=$(pwd)

yarn
yarn c

# build MCC
cd ../multi-chain-client
yarn
yarn build

ch $CURRENT_DIR

# build
yarn link flare-mcc
yarn build
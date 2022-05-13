export CURRENT_DIR=$(pwd)

yarn

# first yarn calls sometimes fails
yarn

# hardhat
yarn c
bash ./script/replace-mcc-link.sh

# build MCC
cd ../multi-chain-client
yarn
yarn build

yarn link

cd $CURRENT_DIR

# build
yarn link flare-mcc

yarn build
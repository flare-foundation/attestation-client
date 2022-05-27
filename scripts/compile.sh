export CURRENT_DIR=$(pwd)

yarn

# first yarn calls sometimes fails
yarn

# hardhat
yarn c

# build MCC
#bash ./script/replace-mcc-link.sh
#cd ../multi-chain-client
#yarn
#yarn build

#yarn link

cd $CURRENT_DIR

# build
# yarn link flare-mcc

yarn build
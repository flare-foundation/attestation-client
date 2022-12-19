export CURRENT_DIR=$(pwd)

rm -rf node_modules

rm -rf typechain-truffle
rm -rf typechain-web3-v1
rm -rf artifacts

yarn install --frozen-lockfile

# hardhat
yarn c

# main build
yarn build
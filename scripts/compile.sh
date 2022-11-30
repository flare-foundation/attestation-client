export CURRENT_DIR=$(pwd)

yarn install --frozen-lockfile

# hardhat
yarn c

# main build
yarn build
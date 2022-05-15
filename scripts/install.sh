export RED='\033[0;31m'
export GREEN='\033[0;32m'
export NC='\033[0m' # No Color
export REDBOLD="${RED}$(tput bold)"
export GREENBOLD="${GREEN}$(tput bold)"
export NCNORMAL="${NC}$(tput sgr0)"

export CURRENT_DIR=$(pwd)

# copy services
echo -e "${REDBOLD}[1] ${GREENBOLD}Copying services...${NC}"
mkdir -p ~/.config/systemd/user
cp ./scripts/templates/*.service ~/.config/systemd/user

# enable services
echo -e "${REDBOLD}[2] ${GREENBOLD}Installing services...${NC}"

systemctl --user daemon-reload

systemctl --user enable indexer-xrp.service
systemctl --user enable indexer-btc.service
systemctl --user enable indexer-ltc.service
systemctl --user enable indexer-algo.service
systemctl --user enable indexer-doge.service

systemctl --user enable songbird-attester-client.service
systemctl --user enable songbird-backend.service

systemctl --user enable attester-alerts

# clone mcc repo

cd ..
git clone https://github.com/flare-foundation/multi-chain-client.git
cd $CURRENT_DIR

# compile
echo -e "${REDBOLD}[3] ${GREENBOLD}Compile...${NC}"
bash ./scripts/compile.sh

# deploy
echo -e "${REDBOLD}[4] ${GREENBOLD}Deploy all started${NC}"
bash ./scripts/deploy-all.sh

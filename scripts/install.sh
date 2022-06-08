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

# songbird
systemctl --user enable songbird-attester-client.service
systemctl --user enable songbird-backend.service

# coston
systemctl --user enable coston-attester-client.service
systemctl --user enable coston-backend.service

systemctl --user enable attester-alerts

# compile
echo -e "${REDBOLD}[3] ${GREENBOLD}Compile...${NC}"
bash ./scripts/compile.sh

# prepare configurations
yarn ts-node lib/install/install.ts ../attestation-suite-config/

bash ./scripts/initialize-mysql.sh

# deploy
echo -e "${REDBOLD}[4] ${GREENBOLD}Deploy all started${NC}"
bash ./scripts/deploy-all.sh

# update config
bash ./scripts/update-config.sh

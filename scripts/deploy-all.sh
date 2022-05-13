export RED='\033[0;31m'
export GREEN='\033[0;32m'
export NC='\033[0m' # No Color
export REDBOLD="${RED}$(tput bold)"
export GREENBOLD="${GREEN}$(tput bold)"
export NCNORMAL="${NC}$(tput sgr0)"

# install services
echo -e "${REDBOLD}[3] ${GREENBOLD}Installing Indexer...${NC}"
bash ./scripts/deploy-indexer

echo -e "${REDBOLD}[4] ${GREENBOLD}Installing Alerts...${NC}"
#bash ./scripts/deploy-alerts

echo -e "${REDBOLD}[5] ${GREENBOLD}Installing Songbird Attester Client...${NC}"
#bash ./scripts/deploy-songbird-attester

echo -e "${REDBOLD}[6] ${GREENBOLD}Installing Songbird Backend...${NC}"
#bash ./scripts/deploy-songbird-backend
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export NC='\033[0m' # No Color
export REDBOLD="${RED}$(tput bold)"
export GREENBOLD="${GREEN}$(tput bold)"
export NCNORMAL="${NC}$(tput sgr0)"

echo -e "${GREENBOLD}Installing Attestation Suite dependencies${NC}"

echo -e "${REDBOLD}[1] ${GREENBOLD}Installing ${REDBOLD}nvm${NC}"
# node
sudo apt-get update
sudo apt install curl -y
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash

source ~/.profile 
source ~/.nvm/nvm.sh
nvm install 14.15.4
nvm alias default 14.15.4
nvm use 14.15.4

# yarn
echo -e "${REDBOLD}[2] ${GREENBOLD}Installing ${REDBOLD}yarn${NC}"
sudo apt install npm -y
sudo npm install --global yarn -y

source ~/.profile 


bash ./scripts/install-config.sh

echo -e "${GREENBOLD}Installing Attestation Suite dependencies${NC}"

echo -e "${REDBOLD}[1] ${GREENBOLD}Installing ${REDBOLD}nvm${NC}"
# node
sudo apt-get update
sudo apt install curl -y
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash

source ~/.profile 
source ~/.nvm/nvm.sh
nvm install 16.17.1
nvm alias default 16.17.1
nvm use 16.17.1

# yarn
echo -e "${REDBOLD}[2] ${GREENBOLD}Installing ${REDBOLD}yarn${NC}"
sudo apt install npm -y
sudo npm install --global yarn -y

source ~/.profile 


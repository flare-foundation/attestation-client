#!/bin/bash
source ./scripts/install-config.sh

export CONFIG_DIR=../attestation-suite-config

# check if directory already exists 
if [ -d "$CONFIG_DIR" ] 
then
    echo -e "Attestation Suite Configuration directory $CONFIG_DIR already exists" 
    echo -e "${REDBOLD}WARNING: This will overwrite all your configurations${NC}" 

    while true; do
        read -p "Do you wish to continue [yes/no]? " yn
        case $yn in
            [Yy]* ) 
                echo -e "${REDBOLD}Overwriting existing configuration${NC}"
                break;;
            [Nn]* ) 
                echo "Exit with no actions"
                exit;;
            * ) echo "Please answer yes or no.";;
        esac
    done
#else    
fi


# install
echo -e "${GREEN}Installing configurations${NC}" 

mkdir -p $CONFIG_DIR
cp -a configs/.install/. $CONFIG_DIR



# initial main config update
source .config.secret.sh2

yarn ts-node lib/install/install-file.ts -i ./configs/.install/chains.credentials.json -o ../attestation-suite-config/chains.credentials.json
yarn ts-node lib/install/install-file.ts -i ./configs/.install/database.credentials.json -o ../attestation-suite-config/database.credentials.json
yarn ts-node lib/install/install-file.ts -i ./configs/.install/networks.credentials.json -o ../attestation-suite-config/networks.credentials.json


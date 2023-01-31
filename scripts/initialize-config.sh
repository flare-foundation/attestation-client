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
cp -d configs/.install/. $CONFIG_DIR
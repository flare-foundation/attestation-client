bash ./scripts/install-config.sh

export CURRENT_DIR=$(pwd)

if $ENABLE_INDEXER; then
   echo "Install Indexer"
fi

if $ENABLE_MONITOR; then
   echo "Install Monitor"
fi

if $ENABLE_FLARE; then
   echo "Install FLARE"
fi

if $ENABLE_SONGBIRD; then
   echo "Install SONGBIRD"
fi

if $ENABLE_COSTON; then
   echo "Install COSTON"
fi

if $ENABLE_COSTON2; then
   echo "Install COSTON2"
fi

source ~/.profile 
source ~/.nvm/nvm.sh

# install services
bash ./scripts/install-services.sh

# compile
echo -e "${REDBOLD}[3] ${GREENBOLD}Compile...${NC}"
bash ./scripts/compile.sh

# prepare configurations
yarn ts-node lib/install/install.ts ../attestation-suite-config/

# enable local mysql
if $ENABLE_LOCAL_MYSQL; then
    bash ./scripts/install-local-mysql.sh
fi

# deploy
echo -e "${REDBOLD}[4] ${GREENBOLD}Deploy all started${NC}"
bash ./scripts/deploy-all.sh

# update config
bash ./scripts/update-config.sh

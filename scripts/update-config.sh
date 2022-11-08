#!/bin/bash
source ./scripts/install-config.sh

export CONFIGDIR_SECURE_FLARE=../attestation-suite-config/prepared/flare
export CONFIGDIR_SECURE_SGB=../attestation-suite-config/prepared/songbird
export CONFIGDIR_SECURE_C1=../attestation-suite-config/prepared/coston
export CONFIGDIR_SECURE_C2=../attestation-suite-config/prepared/coston2

# prepare configurations
yarn ts-node lib/install/install.ts ../attestation-suite-config/

# copy configs to all modules
echo -e "${GREENBOLD}Copy configurations...${NC}"

# for admin
mkdir -p ./configs/.secure/
cp -a $CONFIGDIR_SECURE_C1/. ./configs/.secure/
sed -i 's+../../+../+g' configs/.secure/alerts-config.json

# if $ENABLE_INDEXER; then
#     cp -a $CONFIGDIR_SECURE_C1/. ../global/indexer/configs/prod/
# fi

# if $ENABLE_MONITOR; then
#     cp -a $CONFIGDIR_SECURE_C1/. ../global/alerts/configs/prod/
# fi

# if $INSTALL_FLARE; then
#     cp -a $CONFIGDIR_SECURE_FLARE/. ../flare/attester-client/configs/prod/
#     cp -a $CONFIGDIR_SECURE_FLARE/. ../flare/backend/configs/prod/
# fi

# if $INSTALL_SONGBIRD; then
#     cp -a $CONFIGDIR_SECURE_SGB/. ../songbird/attester-client/configs/prod/
#     cp -a $CONFIGDIR_SECURE_SGB/. ../songbird/backend/configs/prod/
# fi

# if $INSTALL_COSTON; then
#     cp -a $CONFIGDIR_SECURE_C1/. ../coston/attester-client/configs/prod/
#     cp -a $CONFIGDIR_SECURE_C1/. ../coston/backend/configs/prod/
# fi

# if $INSTALL_COSTON2; then
#     cp -a $CONFIGDIR_SECURE_C2/. ../coston2/attester-client/configs/prod/
#     cp -a $CONFIGDIR_SECURE_C2/. ../coston2/backend/configs/prod/
# fi

# if $ENABLE_LOCAL_MYSQL; then
#     # update MYSQL passwords
#     echo -e "${GREENBOLD}Update mysql...${NC}"
#     sudo mysql --force < ../attestation-suite-config/prepared/coston/update.sql
# fi

# restart all services
source ./scripts/services-restart-all.sh


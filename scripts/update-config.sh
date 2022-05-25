export RED='\033[0;31m'
export GREEN='\033[0;32m'
export NC='\033[0m' # No Color
export REDBOLD="${RED}$(tput bold)"
export GREENBOLD="${GREEN}$(tput bold)"
export NCNORMAL="${NC}$(tput sgr0)"


export CONFIGDIR_SECURE=../attestation-suite-config/prepared/coston
export CONFIGDIR_SECURE_SGB=../attestation-suite-config/prepared/songbird

# prepare configurations
yarn ts-node lib/install/install.ts ../attestation-suite-config/

# update MYSQL passwords
echo -e "${GREENBOLD}Update mysql...${NC}"
sudo mysql < ../attestation-suite-config/prepared/coston/update.sql

# copy configs to all modules
echo -e "${GREENBOLD}Copy configurations...${NC}"
cp -a $CONFIGDIR_SECURE/. ../global/indexer/configs/prod/
cp -a $CONFIGDIR_SECURE/. ../global/alerts/configs/prod/

cp -a $CONFIGDIR_SECURE/. ../coston/attester-client/configs/prod/
cp -a $CONFIGDIR_SECURE/. ../coston/backend/configs/prod/

cp -a $CONFIGDIR_SECURE_SGB/. ../songbird/attester-client/configs/prod/
cp -a $CONFIGDIR_SECURE_SGB/. ../songbird/backend/configs/prod/


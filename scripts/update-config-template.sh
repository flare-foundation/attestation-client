export RED='\033[0;31m'
export GREEN='\033[0;32m'
export NC='\033[0m' # No Color
export REDBOLD="${RED}$(tput bold)"
export GREENBOLD="${GREEN}$(tput bold)"
export NCNORMAL="${NC}$(tput sgr0)"

export CONFIGDIR_TEMPLATES_DEST=../attestation-suite-config/templates
export CONFIGDIR_TEMPLATES_SRC=./config/.install/templates

# copy configs templates to destination folder (initialize-config.sh must have been called before so that folders are created)
echo -e "${GREENBOLD}Update configurations templates...${NC}"

rsync --update $CONFIGDIR_TEMPLATES_SRC/. $CONFIGDIR_TEMPLATES_DEST/.

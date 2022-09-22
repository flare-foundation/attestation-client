#!/bin/bash

source ./scripts/install-config.sh

failed=false

check() {
    if $2; then
        echo -e "${GREENBOLD}Install ${NC}${BOLD}$1${GREENBOLD} chain Attestation Client${NC}"

        if [ "$3" = "" ] ; then
            echo -e "   ${REDBOLD}ERROR: Secret for $1 not set.${NC}"
            echo -e "   Add ${BOLD}export $3=<secret>${NC} into file ${REDBOLD}.config.secrets.sh${NC}"
            failed=true
        fi
    fi
}

check2() {
    if $2; then
        echo -e "${GREENBOLD}Install ${NC}${BOLD}$1${GREENBOLD} module${NC}"

        if [ "$3" = "" ] ; then
            echo -e "   ${REDBOLD}ERROR: Secret for $1 not set.${NC}"
            echo -e "   Add ${BOLD}export $3=<secret>${NC} into file ${REDBOLD}.config.secrets.sh${NC}"
            failed=true
        fi
    fi
}

source ./.config.secret.sh2

check FLARE $INSTALL_FLARE $SECRET_FLARE
check SONGBIRD $INSTALL_SONGBIRD $SECRET_SONGBIRD
check COSTON $INSTALL_COSTON $SECRET_COSTON
check COSTON2 $INSTALL_COSTON2 $SECRET_COSTON2

check2 "testnet nodes" $INSTALL_NODES_TESTNET $SECRET_NODES_TESTNET
check2 "mainnet nodes" $INSTALL_NODES_MAINNET $SECRET_NODES_MAINNET

if $failed ; then
   echo -e "${REDBOLD}Exiting${NC}"
   exit
fi
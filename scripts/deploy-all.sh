bash ./scripts/install-config.sh

# install services
if $ENABLE_INDEXER; then
    echo -e "${REDBOLD}[4.1] ${GREENBOLD}Installing Indexer...${NC}"
    bash ./scripts/deploy-indexer
fi

if $ENABLE_MONITOR; then
    echo -e "${REDBOLD}[4.2] ${GREENBOLD}Installing Alerts...${NC}"
    bash ./scripts/deploy-alerts
fi

if $INSTALL_FLARE; then
    echo -e "${REDBOLD}[4.3] ${GREENBOLD}Installing Flare Attester Client...${NC}"
    bash ./scripts/deploy-flare-attester

    echo -e "${REDBOLD}[4.4] ${GREENBOLD}Installing Flare Backend...${NC}"
    bash ./scripts/deploy-flare-backend
fi

if $INSTALL_SONGBIRD; then
    echo -e "${REDBOLD}[4.5] ${GREENBOLD}Installing Songbird Attester Client...${NC}"
    bash ./scripts/deploy-songbird-attester

    echo -e "${REDBOLD}[4.6] ${GREENBOLD}Installing Songbird Backend...${NC}"
    bash ./scripts/deploy-songbird-backend
fi

if $INSTALL_COSTON; then
    echo -e "${REDBOLD}[4.7] ${GREENBOLD}Installing Coston Attester Client...${NC}"
    bash ./scripts/deploy-coston-attester

    echo -e "${REDBOLD}[4.8] ${GREENBOLD}Installing Coston Backend...${NC}"
    bash ./scripts/deploy-coston-backend
fi

if $INSTALL_COSTON2; then
    echo -e "${REDBOLD}[4.9] ${GREENBOLD}Installing Coston2 Attester Client...${NC}"
    bash ./scripts/deploy-coston2-attester

    echo -e "${REDBOLD}[4.10] ${GREENBOLD}Installing Coston2 Backend...${NC}"
    bash ./scripts/deploy-coston2-backend
fi

# restart all services
bash ./scripts/services-restart-all.sh
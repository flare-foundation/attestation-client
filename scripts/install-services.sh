# copy services
echo -e "${REDBOLD}[1] ${GREENBOLD}Copying services...${NC}"
mkdir -p ~/.config/systemd/user
cp ./scripts/templates/*.service ~/.config/systemd/user

# enable services
echo -e "${REDBOLD}[2] ${GREENBOLD}Installing services...${NC}"

systemctl --user daemon-reload

systemctl --user enable indexer-xrp.service
systemctl --user enable indexer-btc.service
systemctl --user enable indexer-ltc.service
systemctl --user enable indexer-algo.service
systemctl --user enable indexer-doge.service
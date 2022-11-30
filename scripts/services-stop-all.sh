#!/bin/bash
source ./scripts/install-config.sh

if $ENABLE_INDEXER; then
    systemctl --user stop indexer-xrp.service
    systemctl --user stop indexer-btc.service
    systemctl --user stop indexer-ltc.service
    systemctl --user stop indexer-algo.service
    systemctl --user stop indexer-doge.service
fi

if $ENABLE_MONITOR; then
    systemctl --user stop attester-alerts
fi

if $INSTALL_FLARE; then
    systemctl --user stop flare-attester-client.service
    systemctl --user stop flare-backend.service
fi

if $INSTALL_SONGBIRD; then
    systemctl --user stop songbird-attester-client.service
    systemctl --user stop songbird-backend.service
fi

if $INSTALL_COSTON; then
    systemctl --user stop coston-attester-client.service
    systemctl --user stop coston-backend.service
fi

if $INSTALL_COSTON2; then
    systemctl --user stop coston2-attester-client.service
    systemctl --user stop coston2-backend.service
fi

# systemctl --user stop coston-spammer-btc.service
# systemctl --user stop coston-spammer-ltc.service
# systemctl --user stop coston-spammer-xrp.service
# systemctl --user stop coston-spammer-algo.service
# systemctl --user stop coston-spammer-doge.service

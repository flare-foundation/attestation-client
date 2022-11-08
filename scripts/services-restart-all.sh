#!/bin/bash
source ./scripts/install-config.sh

if $ENABLE_INDEXER; then
    systemctl --user restart indexer-xrp
    systemctl --user restart indexer-btc
    systemctl --user restart indexer-ltc
    systemctl --user restart indexer-algo
    systemctl --user restart indexer-doge
fi

if $ENABLE_MONITOR; then
    systemctl --user restart attester-alerts
fi

if $INSTALL_FLARE; then
    systemctl --user restart flare-attester-client
    systemctl --user restart flare-backend
fi

if $INSTALL_SONGBIRD; then
    systemctl --user restart songbird-attester-client
    systemctl --user restart songbird-backend
fi

if $INSTALL_COSTON; then
    systemctl --user restart coston-attester-client
    systemctl --user restart coston-backend
fi

if $INSTALL_COSTON2; then
    systemctl --user restart coston2-attester-client
    systemctl --user restart coston2-backend
fi

# systemctl --user restart coston-spammer-btc.service
# systemctl --user restart coston-spammer-ltc.service
# systemctl --user restart coston-spammer-xrp.service
# systemctl --user restart coston-spammer-algo.service
# systemctl --user restart coston-spammer-doge.service


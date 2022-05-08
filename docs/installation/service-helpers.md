[TOC](./../README.md)/[General installation](../installation/general-installation.md)
# Service helper commands


## Install all services
Before installing services, service files must be copied from `<installation root>/scripts/templates/` into `/home/<username>/.config/systemd/user/`.

```
systemctl --user daemon-reload

systemctl --user enable indexer-xrp.service
systemctl --user enable indexer-btc.service
systemctl --user enable indexer-ltc.service
systemctl --user enable indexer-algo.service
systemctl --user enable indexer-doge.service

systemctl --user enable coston-attester-client.service
systemctl --user enable coston-backend.service

systemctl --user enable songbird-attester-client.service
systemctl --user enable songbird-backend.service

systemctl --user enable attester-alerts
```

## Stop all services
```
systemctl --user stop indexer-xrp.service
systemctl --user stop indexer-btc.service
systemctl --user stop indexer-ltc.service
systemctl --user stop indexer-algo.service
systemctl --user stop indexer-doge.service

systemctl --user stop coston-attester-client.service
systemctl --user stop coston-backend.service

systemctl --user stop songbird-attester-client.service
systemctl --user stop songbird-backend.service

systemctl --user stop attester-alerts
```

## Restart all services
```
systemctl --user restart indexer-xrp
systemctl --user restart indexer-btc
systemctl --user restart indexer-ltc
systemctl --user restart indexer-algo
systemctl --user restart indexer-doge

systemctl --user restart coston-attester-client
systemctl --user restart coston-backend

systemctl --user restart songbird-attester-client
systemctl --user restart songbird-backend

systemctl --user restart attester-alerts
```
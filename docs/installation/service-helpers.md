# Service helper commands

## Install all services

Before installing services, service files must be copied from `<installation root>/scripts/templates/` into `/home/<username>/.config/systemd/user/`.

``` bash
systemctl --user daemon-reload

systemctl --user enable indexer-xrp.service
systemctl --user enable indexer-btc.service
systemctl --user enable indexer-ltc.service
systemctl --user enable indexer-algo.service
systemctl --user enable indexer-doge.service

systemctl --user enable verifier-xrp.service
systemctl --user enable verifier-btc.service
systemctl --user enable verifier-ltc.service
systemctl --user enable verifier-algo.service
systemctl --user enable verifier-doge.service

systemctl --user enable coston-attester-client.service
systemctl --user enable coston-web-server.service

systemctl --user enable coston2-attester-client.service
systemctl --user enable coston2-web-server.service

systemctl --user enable songbird-attester-client.service
systemctl --user enable songbird-web-server.service


systemctl --user enable attester-alerts
```

## Stop all services

``` bash
systemctl --user stop indexer-xrp.service
systemctl --user stop indexer-btc.service
systemctl --user stop indexer-ltc.service
systemctl --user stop indexer-algo.service
systemctl --user stop indexer-doge.service

systemctl --user stop verifier-xrp.service
systemctl --user stop verifier-btc.service
systemctl --user stop verifier-ltc.service
systemctl --user stop verifier-algo.service
systemctl --user stop verifier-doge.service

systemctl --user stop coston-attester-client.service
systemctl --user stop coston-web-server.service

systemctl --user stop coston2-attester-client.service
systemctl --user stop coston2-web-server.service

systemctl --user stop songbird-attester-client.service
systemctl --user stop songbird-web-server.service

systemctl --user stop attester-alerts
```

## Restart all services

``` bash
systemctl --user restart indexer-xrp
systemctl --user restart indexer-btc
systemctl --user restart indexer-ltc
systemctl --user restart indexer-algo
systemctl --user restart indexer-doge

systemctl --user restart verifier-xrp
systemctl --user restart verifier-btc
systemctl --user restart verifier-ltc
systemctl --user restart verifier-algo
systemctl --user restart verifier-doge

systemctl --user restart coston-attester-client
systemctl --user restart coston-web-server

systemctl --user restart coston2-attester-client
systemctl --user restart coston2-web-server

systemctl --user restart songbird-attester-client
systemctl --user restart songbird-web-server

systemctl --user restart attester-alerts
```

## Check logs

journalctl --user -u indexer-xrp -f -n 100
journalctl --user -u indexer-btc -f -n 100
journalctl --user -u indexer-ltc -f -n 100
journalctl --user -u indexer-algo -f -n 100
journalctl --user -u indexer-doge -f -n 100

journalctl --user -u verifier-xrp -f -n 100
journalctl --user -u verifier-btc -f -n 100
journalctl --user -u verifier-ltc -f -n 100
journalctl --user -u verifier-algo -f -n 100
journalctl --user -u verifier-doge -f -n 100

journalctl --user -u coston-attester-client -f -n 100
journalctl --user -u coston-web-server -f -n 100

journalctl --user -u coston2-attester-client -f -n 100
journalctl --user -u coston2-web-server -f -n 100

journalctl --user -u songbird-attester-client -f -n 100
journalctl --user -u songbird-web-server -f -n 100

journalctl --user -u attester-alerts -f -n 100

[Home](./../README.md)/[General installation](../installation/general-installation.md)

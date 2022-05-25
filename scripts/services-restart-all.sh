systemctl --user restart indexer-xrp
systemctl --user restart indexer-btc
systemctl --user restart indexer-ltc
systemctl --user restart indexer-algo
systemctl --user restart indexer-doge

systemctl --user restart coston-attester-client

systemctl --user restart coston-spammer-btc.service
systemctl --user restart coston-spammer-ltc.service
systemctl --user restart coston-spammer-xrp.service
systemctl --user restart coston-spammer-algo.service
systemctl --user restart coston-spammer-doge.service

systemctl --user restart coston-backend

systemctl --user restart songbird-attester-client
systemctl --user restart songbird-spammer
systemctl --user restart songbird-backend

systemctl --user restart attester-alerts

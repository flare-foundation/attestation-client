systemctl --user stop indexer-xrp.service
systemctl --user stop indexer-btc.service
systemctl --user stop indexer-ltc.service
systemctl --user stop indexer-algo.service
systemctl --user stop indexer-doge.service

systemctl --user stop coston-attester-client.service

systemctl --user stop coston-spammer-btc.service
systemctl --user stop coston-spammer-ltc.service
systemctl --user stop coston-spammer-xrp.service
systemctl --user stop coston-spammer-algo.service
systemctl --user stop coston-spammer-doge.service

systemctl --user stop coston-backend.service

systemctl --user stop songbird-attester-client.service
systemctl --user stop songbird-spammer.service
systemctl --user stop songbird-backend.service

systemctl --user stop attester-alerts
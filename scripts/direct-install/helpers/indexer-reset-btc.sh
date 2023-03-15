systemctl --user stop indexer-btc.service
node dist/src/runIndexer -a BTC -r RESET_ACTIVE
systemctl --user start indexer-btc.service

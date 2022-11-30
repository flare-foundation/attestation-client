systemctl --user stop indexer-btc.service
CONFIG_PATH=.secure node dist/lib/runIndexer -a BTC -r RESET_ACTIVE
systemctl --user start indexer-btc.service

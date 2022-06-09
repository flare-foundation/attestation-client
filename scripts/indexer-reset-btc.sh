systemctl --user stop indexer-btc.service
CONFIG_PATH=.secure node dist/lib/indexer/indexer -c BTC -r RESET_ACTIVE
systemctl --user start indexer-btc.service

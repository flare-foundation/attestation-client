systemctl --user stop indexer-ltc.service
CONFIG_PATH=.secure node dist/src/runIndexer -a LTC -r RESET_ACTIVE
systemctl --user start indexer-ltc.service

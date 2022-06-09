systemctl --user stop indexer-doge.service
CONFIG_PATH=.secure node dist/lib/indexer/indexer -c DOGE -r RESET_ACTIVE
systemctl --user start indexer-doge.service

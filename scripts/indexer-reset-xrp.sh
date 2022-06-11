systemctl --user stop indexer-xrp.service
CONFIG_PATH=.secure node dist/lib/indexer/indexer -c XRP -r RESET_ACTIVE
systemctl --user start indexer-xrp.service

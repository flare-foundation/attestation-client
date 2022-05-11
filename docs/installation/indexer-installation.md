[TOC](./../README.md)/[General installation](../installation/general-installation.md)
# Indexer Installation

## Prerequisites
Indexer module requires next prerequisites:
- NODE
- YARN
- MYSQL
- ctail

Installation instructions for all prerequisites are in [general installation](general-installation.md) section.

## Installation

### Deployment

Indexer is installed with the deployment script `./script/deploy-indexer.sh`.

Before running script you need to change your server username and address.
```
export USER=<username>
export SERVER=<your server address>
```

After these corrections are made run the script:
```
./script/deploy-indexer
```

Deployment is performed into folder `/home/<username>/global/indexer`.

Logs are in `global/indexer/logs/attester-<chain name>.log`.

Example: 
```
ctail -f -i global/indexer/logs/attester-XRP.log
```


### Services

After the 1st deployment the services must be installed. Once installed they will be automatically restarted by deployment script.

Indexer uses one service for each chain: 
- indexer-algo
- indexer-btc
- indexer-doge
- indexer-ltc
- indexer-xrp

Check [services](services.md) section for instructions on how to manage services.

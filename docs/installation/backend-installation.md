[TOC](./../README.md)/[General installation](../installation/general-installation.md)
# Backend Installation

## Prerequisits
Indexer module requires next prerequisits:
- NODE
- YARN
- ctail

Installation instructions for all prerequisits are in [general installation](general-installation.md) section.

## Installation

### Deployment

Backend is installed with the deployment script `./script/deploy-songbird-backend.sh`.

Before running the script you need to change your server username and remote server address.
```
export USER=<username>
export SERVER=<your server address>
```

After these corrections are made run the script:
```
./script/deploy-songbird-backend
```

Deployment is performed into folder `/home/<username>/songbird/backend`.

Logs are in `songbird/backend/logs/attester-global.log`.

Example: 
```
ctail -f -i songbird/backend/logs/attester-global.log
```



### Services

After the 1st deployment the service must be installed. Once installed it will be automatically restarted by deployment script.


Backend uses one service: 
- songbird-backend

Check [services](services.md) section for instructions on how to manage services.

# Backend Installation

## Prerequisites

Indexer module requires:

- NODE
- YARN
- ctail

Installation instructions for all prerequisites are in [general installation](general-installation.md) section.

## Installation

### Deployment

Backend is installed with the deployment script `./script/deploy-songbird-backend.sh`.

Before running the script you need to change your server username and remote server address.

``` bash
export USER=<username>
export SERVER=<your server address>
```

After these corrections are made run the script:

``` bash
./script/deploy-songbird-backend
```

Deployment is performed into folder `/home/<username>/songbird/backend`.

Logs are in `songbird/backend/logs/attester-global.log`.

Example:

``` bash
ctail -f -i songbird/backend/logs/attester-global.log
```

### Services

After the 1st deployment, the service must be installed. Once installed, it will be automatically restarted by the deployment script.

Backend uses one service:

- songbird-backend

Check [services](services.md) section for instructions on how to manage services.

[Home](./../README.md)/[General installation](../installation/general-installation.md)

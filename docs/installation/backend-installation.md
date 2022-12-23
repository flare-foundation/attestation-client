# Webserver Installation

## Prerequisites

Indexer module requires:

- NODE
- YARN
- ctail

Installation instructions for all prerequisites are in [general installation](general-installation.md) section.

## Installation

### Deployment

Webserver is installed with the deployment script `./script/deploy-songbird-webserver.sh`.

Before running the script you need to change your server username and remote server address.

``` bash
export USER=<username>
export SERVER=<your server address>
```

After these corrections are made run the script:

``` bash
./script/deploy-songbird-webserver
```
*obsolete*
Deployment is performed into folder `/home/<username>/songbird/webserver`.

Logs are in `songbird/webserver/logs/attester-global.log`.

Example:

``` bash
ctail -f -i songbird/webserver/logs/attester-global.log
```

### Services

After the 1st deployment, the service must be installed. Once installed, it will be automatically restarted by the deployment script.

Backend uses one service:

- songbird-webserver

Check [services](services.md) section for instructions on how to manage services.

[Home](./../README.md)/[General installation](../installation/general-installation.md)

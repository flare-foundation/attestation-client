# Alerts Installation

## Prerequisits

Indexer module requires:

- NODE
- YARN
- MYSQL
- ctail

Installation instructions for all prerequisites are in [general installation](general-installation.md) section.

## Installation

### Deployment

Alerts is installed with the deployment script `./script/deploy-attester-alerts.sh`.

Before running the script you need to change your server username and remote server address.

``` bash
export USER=<username>
export SERVER=<your server address>
```

After these corrections are made run the script:

``` bash
./script/deploy-attester-alerts
```

Deployment is performed into folder `/home/<username>/global/alerts`.

Logs are in `global/alerts/logs/attester-global.log`.

Example:

``` bash
ctail -f -i global/alerts/logs/attester-global.log
```

### Services

After the 1st deployment, the service must be installed. Once installed, it will be automatically restarted by the deployment script.

Attester alerts uses one service:

- attester-alerts

Check [services](services.md) section for instructions on how to manage services.

[Home](./../README.md)/[General installation](../installation/general-installation.md)

# General Installation

## Supported systems

The Attestation Suite has been tested on the following platforms:

- UBUNTU 20.04
- WSL 0.2.1

## Minimal hardware requirements

Minimal hardware requirements for running Attester-Suite are:
- CPU: 4 cores @ 2.2GHz
- DISK: 500 GB SSD disk
- MEMORY: 16 GB

## Installation with dependencties

Download Attestation Suite repository

``` bash
cd ~
mkdir -p attestation-suite
cd attestation-suite

git clone https://github.com/flare-foundation/attestation-client.git
cd attestation-client

./script/install-dependencies.sh
./script/initialize-config.sh
```

Setup settings in `../attestation-suite-config/*.json` files:
- chain.credentials.json 
- database.json
- network.credential.json



Use next command to copy secure config to the server
```
scp secure.zip ubuntu@<server ip>:/home/ubuntu/attestation-suite/attestation-suite-config/
```

After all prerequisites and configuration files are setup you can install the Attesttaion Suite with the installation script:

This script installs all Attestation Suite modules. If you wish to exclude some modules, edit the script `deploy-all.sh`.

``` bash
cd ~/attestation-suite/attestation-client
bash ./scripts/install.sh

```

Details about installation and dependencies are [here](./installation-details.md)

## Update configuration
Once Attestation Suite is installed you can change settings and run next script.

```
cd ~/attestation-suite/attestation-client
./scripts/update-config.sh
```


[Back to Home](./../README.md)

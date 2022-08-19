# General Installation

## Supported systems

The Attestation Suite has been tested on the following platforms:

- UBUNTU 20.04
- WSL 0.2.1

## Recomended hardware requirements

Minimal hardware requirements for running Attester-Suite are:
- CPU: 4 cores @ 2.2GHz
- DISK: 500 GB SSD disk
- MEMORY: 16 GB

## Installation with dependencties

Start on a new clean UBUNTU installation with admin priviledges.

---
### 1) Download Attestation Suite repository and install prerequisites

``` bash
cd ~
mkdir -p attestation-suite
cd attestation-suite

git clone https://github.com/flare-foundation/attestation-client.git
cd attestation-client

./scripts/install-dependencies.sh
./scripts/initialize-config.sh
```

---
### 2) Setup configuration files

Setup configuration files in folder `../attestation-suite-config/`:
- chains.credentials.json 
```
nano ~/attestation-suite/attestation-suite-config/chains.credentials.json
```
- database.json
```
nano ~/attestation-suite/attestation-suite-config/database.credentials.json
```
- networks.credential.json
```
nano ~/attestation-suite/attestation-suite-config/networks.credentials.json
```

NOTE: You can change configurations later on.

---
### 3) Run main install
After all prerequisites and configuration files are setup you can install the Attesttaion Suite with the installation script:

This script installs all Attestation Suite modules. If you wish to exclude some modules, edit the script `deploy-all.sh`.

``` bash
cd ~/attestation-suite/attestation-client
bash ./scripts/install.sh

```

Details about installation and dependencies are [here](./installation-details.md)

## Update configuration
Once Attestation Suite is installed you can change configuration files and run next script.

```
cd ~/attestation-suite/attestation-client
./scripts/update-config.sh
```

the script will :
- preprocess configuration files
- copy configuration files into deployment folders
- update mysql passwords
- restart services


## Attestation Suite database installation

Start on a new clean UBUNTU installation with admin priviledges.

### 1) Copy database installation script
Login on Attestation Suite server and copy `install.sql` to database server.

``` bash
scp ~/attestation-suite/attestation-suite-config/prepared/coston/install.sql ubuntu@<database server ip>
```

### 2) Download Attestation Suite repository and install mysql

``` bash
cd ~
mkdir -p attestation-suite
cd attestation-suite

git clone https://github.com/flare-foundation/attestation-client.git
cd attestation-client

cp ~/install.sql .

./scripts/install-mysql.sh
```


## Administration module
We included a simple WOP administration module that helps monitor and administrate Attestation Suite.

```
cd ~/attestation-suite/attestation-client
yarn admin
```

## Indexer syncing times

- ADA ~10 min
- ALGO ~4 h
- BTC ~20 min
- DOGE ~10 min
- XRP ~4 h



[Back to Home](./../README.md)

# General Installation
## Supported systems

The Attestation Suite has been tested on the following platforms:

- UBUNTU 20.04

## Recomended hardware requirements

Recomended hardware requirements for running Attestation-Suite only are:
- CPU: 4 cores @ 2.2GHz
- DISK: 50 GB SSD disk
- MEMORY: 4 GB

Minimal hardware requirements for complete `testnet` configuration are:
- CPU: 8 cores @ 2.2GHz
- DISK: 100 GB SSD disk
- MEMORY: 8 GB

Minimal hardware requirements for complete `mainnet` configuration are:
- CPU: 16 cores @ 2.2GHz
- DISK: 3 TB SSD disk
- MEMORY: 16 GB

## Complete Attestation Suite `coston2` `testnet` Installation

Start on a new clean ubuntu installation with admin priviledges.

User must ATM be `ubuntu`.

This script will:
- install Attestation Suite
    - indexer
    - monitor
    - attestation client
    - front end
- mysql database
- nodes (testnet)
    - algo
    - btc
    - doge
    - ltc
    - xrp
- nginX (used by frontend)
- certman (used by nginX for ssl certificate)

Estimated installation required: `10min`

---
### 1) Download Attestation Suite repository

``` bash
cd ~
mkdir -p attestation-suite
cd attestation-suite

#git clone https://github.com/flare-foundation/attestation-client.git
git clone https://gitlab.com/flarenetwork/attestation-client.git
cd attestation-client

#git checkout commit-reveal-fixes-c2
git checkout bit-voting

```

---
### 2) Configurate

Edit what modules you want to be installed.

Only `Coston2` chain is enabled by default (ATM).
If you need additional chains edit setting with:
```
nano config.modules.sh
```

Set selected chain secret key. Secret key can be changed later.

Important: also select network host name. Network host name cannot be changed later.
```
nano .config.secret.sh
```

---
### 3) Credentials
Credentials are stored in `../attestation-suite-config` folder to be persistent while updating the repo.

To initialy create credentials use next command:
```
./scripts/initialize-config.sh
```

Modify credential files:
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

Update credentials key in file `credentials.key`.

Use:
 - `direct:password` for direct password.
 - `GoogleCloudSecretManager:address` for Google Cloud Secret manager

 After all credentials and `credentials.key` are set use next script to encode credentials:
 ```
 yarn ts-node src/install/secureCredentials.ts
 ```

 This script creates encrypted `credentials.json.secure` file where all credentials from `*-credentials.json` files.

 ---
For deployment on Attesttaion Suite machine only:
- `credentials.json.secure`
- `credentials.key`
files are needed (in `../attestation-suite-config/` folder). 

 ---
 It is strongly suggested to do this credentials on some super secure machine, and to use GoogleCloudSecretManager.


---
### 4) Install
After the configuration is setup run the main installer
```
./scripts/install.sh
```

## Update configuration
Once Attestation Suite is installed you can change configuration files and run next script.

Settings that cannot be changed are:
- hostname
- node password


Setup configuration files are in folder `../attestation-suite-config/`:


To update changes in configuration run:
```
cd ~/attestation-suite/attestation-client
./scripts/update-config.sh
```

the script will :
- preprocess configuration files
- copy configuration files into deployment folders
- update mysql passwords
- restart services


## Administration module
We included a simple administration module that helps monitor and administrate Attestation Suite.

```
cd ~/attestation-suite/attestation-client
yarn admin
```

## Indexer syncing times

For 2days:

- ALGO running sync (2 days)
- BTC ~20 min
- DOGE ~45 min
- LTC ~10 min
- XRP ~2 h

[Back to Home](./../README.md)

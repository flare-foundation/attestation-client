# Attestation-Suite Instalation

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

## Installation

This deployment will:
- install Attestation-Suite deployment repository from gitlab
- prepare credentials
- deploy dockers for 
    - nodes
        - bitcoin
        - dogecoin
        - ripple
    - indexers and verification serves for
        - btc
        - doge
        - xrp
    - attestation client
    - nginx

Estimated installation required: `5min`

---
NOTE: Current installation is for `Coston2` chain.
---

---
### 1) Download Attestation-Suite repository


``` bash
cd ~
mkdir -p attestation-suite
cd attestation-suite

git clone https://gitlab.com/flarenetwork/attestation-client.git
cd attestation-client

git checkout dockerization

```

---
### 2) Install credentials

To begin with installation you need to first setup credentials.
```
./install-credentials.sh
```

### 3) Update credentials 

---
### 3) Prepare credentials
After credentials have been setup they must be prepared.

This is done with the next script:
```
./prepare-credentials.sh
```

This script creates secure credentials in folder `credentials.prepared`.
Folders from this folder are mapped into dockers.  


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
After the preparing the credentials run the main deployment:
```
./install-dockers.sh
```

## Update configuration
Once Attestation-Suite is installed you can change credentials and configuration files and run next script.

To update changes in configuration run:
```
./stop-all.sh
./prepare-credentials.sh
./start-all.sh
```

the script will :
- stop all services but nodes
- preprocess configuration files
- restart all services

## Indexer syncing times

For 2days:

- ALGO running sync (2 days)
- BTC ~20 min
- DOGE ~45 min
- LTC ~10 min
- XRP ~2 h

[Back to Home](./../README.md)

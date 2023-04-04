# Attestation Suite installation

## Hardware requirements

Recommended hardware requirements for running Attestation Suite only are:
- CPU: 4 cores @ 2.2GHz
- DISK: 50 GB SSD disk
- MEMORY: 4 GB

Minimal hardware requirements for complete `testnet` configuration are:
- CPU: 8 cores @ 2.2GHz
- DISK: 100 GB SSD disk
- MEMORY: 8 GB

Minimal hardware requirements for complete `mainnet` configuration are:
- CPU: 16/32 cores/threads @ 2.2GHz
- DISK: 3 TB NVMe disk
- MEMORY: 64 GB

Most of this power is required for Ripple node.

## Installation

The deployment includes:
- cloning Attestation-Suite deployment repository from github
- preparing credentials
- deploying docker containers for 
    - blockchain nodes
        - bitcoin
        - dogecoin
        - ripple
    - indexers and verification serves for
        - btc
        - doge
        - xrp
    - attestation client
    - nginx

Estimated time: `15min`.

## Prerequisites 

- A machine(s) with `docker` and `docker-compose` installed. 
- A a deployment user being in `docker` group.
- Docker folder should be set to a mount that has sufficient amount of disk space for docker volumes. The installation creates several docker volumes.


## Step 1 - Clone repository and build Docker image

Note that the secure installation should have Step 1 carried out on a separate secure machine
and then have credential configurations copied to a deployment machine.

### 1.1 Download Attestation-Suite repository

``` bash
cd ~
mkdir -p attestation-suite
cd attestation-suite

git clone git@github.com:flare-foundation/attestation-client.git
cd attestation-client

# use relevant branch or tag instead of 'main'
git checkout 2.0.6

```

### 1.2 Build docker image

Run
``` bash
docker build -t attestation-suite . --no-cache
```

## Step 2 - Credential configs generation

### 2.1 Initialize credentials

Go to the `deployment` folder. All deployment data, encrypted credentials and scripts for running are available here.

```bash
cd deployment
```

Initialize credentials first.

``` bash
./initialize-credentials.sh
```

This creates the sub folder `credentials`. 

---
IMPORTANT: Using this command again will overwrite your credentials!

### 2.2 Update credentials 

The file `credentials/configurations.json` contains the keys used to encrypt the credentials.
Provide relevant definition of the encryption keys in the `key` variables.

Use:
 - `direct:<key>` to specify the key directly in place of `<key>`.
 - `GoogleCloudSecretManager:<path>` to specify the secret Google Cloud Secret (More details can be found [here](./../docs/installation/GoogleCloudSecretManager.md) ). Manager path in place of `<path>`

Beside the `configuration.json` file, the `credentials` folder contains several credential configuration files of the form `<******>-credentials.json`.
Update these files with relevant credentials. Note that some credentials/passwords (with values `$(GENERATE_RANDOM_PASSWORD_<**>)`) are randomly generated with a secure random password generator. You may change those to suit your needs. 

Some of the more important settings and credentials include:
- in `networks-credentials.json`:
   - `Network` - set to desired network (e.g. `songbird`, `flare`).
   - `NetworkPrivateKey` - set `0x`-prefixed private key from which attestation client will be submitting attestations to Flare network. Private key can also be specified as a Google Cloud Secred Manager variable. To do that use syntax: 
   ```
   "NetworkPrivateKey":"$(GoogleCloudSecretManager:projects/<project>/secrets/<name>/versions/<version>)"
   ```
   - `StateConnectorContractAddress` - the `StateConnector` contract address on the specific network. 
   - `RPC` - update the network RPC to desired network.
- In `verifier-client-credentials.json` - instead od `localhost` use the IP address of the host machine. On Linux Ubuntu one can get it by running 
```bash
ip addr show docker0 | grep -Po 'inet \K[\d.]+'
```
- in `verifier-server-credentials.json` - Set API keys for supported external blockchains (currently BTC, DOGE and XRP). Default templates are configured 
for two API keys. 

### 2.3 Prepare credentials

After credentials have been set up they must be prepared for deployment.

``` bash
./prepare-credentials.sh
```

This script creates secure credential configs in the sub folder `credentials.prepared` which
contains sub folders that are to be mounted to specific docker containers on the deployment machine.

Each sub folder (docker credentials mount) contains the following:
- `credentials.json.secure` - encrypted credentials (using encryption key as defined in `credentials/configuration.json`)
- `credentials.key` - decryption instruction
- `templates` - sub folder with configurations as templates where credentials are indicated by stubs of the form `${credential_name}`. Non credential parts of configs can be edited directly.

Secure credential configs work as follows. 
A process in a docker container first identifies from  `credentials.key`, how the credentials in can be decrypted `credentials.json.secure` and then the 
credential stubs in templates are filled in. This is done in-memory of the process. The process reads configs and credentials from the rendered template 
structure in memory.

## Step 3 - Installation

### 3.1 - Copying credentials
If the installation is done on different deployment machine then the credential generation, proceed with steps 1.1 and 1.2 (cloning the repo and building the docker image on the deployment machine. Copy the folder `deployment/credentials.prepared` from the secure machine to the deployment machine into 
`<git-repo-root>/deployment` folder.
 
### 3.2 - Installing
Run the installation from the `deployment` folder:
``` bash
./install-dockers.sh mainnet
```

This will install all services using several docker compose files. On the first run it will configure block chain nodes and database instances according to the credentials and configurations.

## Updating credentials and configurations

Once Attestation Suite is installed one can change credentials as follows:
- stop the containers
``` bash
./stop-all.sh mainnet
```
- carry out steps 1.4 and 1.5 on a secure machine nad step 2.1 (copy `credentials.prepare` folder to the deployment machine).
- start all services
``` bash
./start-all.sh mainnet
```

Updating can be done on specific containers only. In this case only specific containers are stopped, steps 1.4, 1.5 are carried out on updated configs, but only changed secure credential configs are copied to the deployment machine into the folders mounted to the specific containers. Those containers are then restarted. Stopping and starting is carried out using `docker-compose` and handy scripts in `deployment` folder.

## Indexer syncing times

For 2days:

- ALGO running sync (2 days)
- BTC ~20 min
- DOGE ~45 min
- LTC ~10 min
- XRP ~2 h

[Back to Home](./../README.md)

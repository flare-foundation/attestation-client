# Dockerized Installation

## Hardware Requirements

The recommended hardware requirements for running only the Attestation Suite are:

- CPU: 4 cores @ 2.2GHz
- DISK: 50 GB SSD disk
- MEMORY: 4 GB

The minimal hardware requirements for a complete `testnet` configuration are:

- CPU: 8 cores @ 2.2GHz
- DISK: 100 GB SSD disk
- MEMORY: 8 GB

The minimal hardware requirements for a complete `mainnet` configuration are:

- CPU: 16/32 cores/threads @ 2.2GHz
- DISK: 3 TB NVMe disk
- MEMORY: 64 GB

Most of this power is required for the Ripple node.

## Software Requirements

The Attestation Suite was tested on Ubuntu 20.02 and Ubuntu 22.02.

Additional required software:

- *Docker* version 20.10.
- *Docker Compose* version 1.29.2

## Prerequisites

- A machine(s) with `docker` and `docker-compose` installed.
- A deployment user in the `docker` group.
- The Docker folder set to a mount point that has sufficient disk space for Docker volumes. The installation creates several Docker volumes.

## Installation

The deployment includes:

- Cloning the Attestation Suite deployment repository from GitHub.
- Preparing credentials.
- Deploying Docker containers for:
    - Blockchain nodes:
        - Bitcoin
        - Dogecoin
        - Ripple
    - Indexers and verification servers for:
        - BTC
        - DOGE
        - XRP
    - Attestation client
    - Nginx

Estimated time: `15min`.

## Step 1 Clone Repository and Build Docker Image

Note that the secure installation should have Step 1 carried out on a separate secure machine and then have credential configurations copied to a deployment machine.

### 1.1 Download Attestation Suite Repository

``` bash
cd ~
mkdir -p attestation-suite
cd attestation-suite

git clone git@github.com:flare-foundation/attestation-client.git
cd attestation-client

# use relevant branch or tag instead of 'main'
git checkout 2.0.10

```

### 1.2 Build Docker Image

Run:

``` bash
docker build -t attestation-suite . --no-cache
```

### 1.3 Initialize Google Cloud Secret Manager

Run:

```bash
docker run --user root -it attestation-suite bash
```

Inside Docker bash, run:

```bash
apt-get install apt-transport-https ca-certificates gnupg -y
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
apt-get update && apt-get install google-cloud-cli
```

Follow the instructions and initialize `gcloud`.

Then run `gcloud auth application-default login` to initialize application access.

Then exit Docker bash with `exit` command.

Get this container's ID with the command `docker ps` and save the image with GCSM initialized with the command:

```bash
Docker commit <container-id> attestation-suite
```

## Step 2 Credential Configs Generation

### 2.1 Initialize Credentials

All deployment data, encrypted credentials, and scripts are available in the `deployment` folder:

```bash
cd deployment
```

Initialize credentials first:

``` bash
./initialize-credentials.sh
```

This creates the subfolder `credentials`.

> **Important**:
> Using this command again will overwrite your credentials!

### 2.2 Update Credentials

The file `credentials/configurations.json` contains the keys used to encrypt the credentials.
Provide relevant definition of the encryption keys in the `key` variables.

Use:

- `direct:<key>` to specify the key directly in place of `<key>`.
- `GoogleCloudSecretManager:<path>` to specify the Google Cloud Secret (More details can be found at [Google Cloud Secret Manager](./../docs/installation/GoogleCloudSecretManager.md) ). Enter the manager path in place of `<path>`.

Beside the `configuration.json` file, the `credentials` folder contains several credential configuration files of the form `<******>-credentials.json`.
Update these files with relevant credentials. Note that some passwords (with values `$(GENERATE_RANDOM_PASSWORD_<**>)`) are randomly generated with a secure random password generator. You may change those to suit your needs.

Some of the more important settings and credentials include:

- In `networks-credentials.json`:

    - `Network` - Set to desired network (e.g., `songbird`, `flare`).
    - `NetworkPrivateKey` - Set `0x`-prefixed private key from which an attestation client submits attestations to the Flare network. A private key can also be specified as a Google Cloud Secret Manager variable. To do that use this syntax:

        ```bash
        "NetworkPrivateKey":"$(GoogleCloudSecretManager:projects/<project>/secrets/<name>/versions/<version>)"
        ```

    - `StateConnectorContractAddress` - The `StateConnector` contract address on the specific network.
    - `RPC` - Update the network RPC to desired network.
- In `verifier-client-credentials.json` - Instead of `localhost`, use the IP address of the host machine. On Linux Ubuntu, get it by running:

    ```bash
    ip addr show docker0 | grep -Po 'inet \K[\d.]+'
    ```

- In `verifier-server-credentials.json` - Set API keys for supported external blockchains (currently BTC, DOGE and XRP). Default templates are configured
for two API keys.

### 2.3 Prepare Credentials

After credentials have been set up they must be prepared for deployment:

``` bash
./prepare-credentials.sh
```

This script creates secure credential configs in the subfolder `credentials.prepared`, which contains subfolders that are to be mounted to specific Docker containers on the deployment machine.

Each subfolder (Docker credentials mount) contains the following:

- `credentials.json.secure` - encrypted credentials (using encryption key as defined in `credentials/configuration.json`).
- `credentials.key` - decryption instructions.
- `templates` - subfolder with configurations as templates where credentials are indicated by stubs of the form `${credential_name}`. Parts of configs that don't concern credentials can be edited directly.

Secure credential configs work as follows: A process in a Docker container first identifies how the credentials in `filecredentials.json.secure` can be decrypted from the file `credentials.key`. Then the credential stubs in templates are filled in. The process reads configs and credentials from the rendered template structure in memory.

## Step 3 Installation

### 3.1 Copying Credentials

If the installation is done on a different deployment machine than the credential generation, proceed with steps 1.1 and 1.2 (cloning the repo and building the Docker image on the deployment machine). Copy the folder `deployment/credentials.prepared` from the secure machine to the deployment machine into the `<git-repo-root>/deployment` folder.

### 3.2 Installing

Run the installation from the `deployment` folder:

``` bash
./install-dockers.sh mainnet
```

This will install all services using several `docker-compose` files. On the first run it will configure block chain nodes and database instances according to the credentials and configurations.

## Updating Credentials and Configurations

Once Attestation Suite is installed, you can change credentials as follows:

- Stop the containers:

``` bash
./stop-all.sh mainnet
```

- Carry out steps 1.4 and 1.5 on a secure machine and step 2.1 (copy `credentials.prepare` folder to the deployment machine).

- Start all services:

``` bash
./start-all.sh mainnet
```

Updating can be done on specific containers only. In this case only specific containers are stopped, steps 1.4 and 1.5 are carried out on updated configs, but only changed secure credential configs are copied to the deployment machine into the folders mounted to the specific containers. Those containers are then restarted. Stopping and starting is carried out using `docker-compose` and handy scripts in `deployment` folder.

## Monitoring

See [Attestation Suite monitoring](./../docs/monitor/monitor.md).

## Indexer Syncing Times

To be ready for use, each network must sync its blocks and transactions with the Flare database indexer.
The Algorand network doesn't have an indexer, so it runs for the actual time the data is needed for.
For two days worth of data, these are the times that each network requires:

- ALGO running sync (2 days)
- BTC ~20 min
- DOGE ~45 min
- LTC ~10 min
- XRP ~2 h

## Maintenance

To make maintenance of the Attestation Suite easier and more efficient, we have taken the time to prepare several useful scripts. These scripts are designed to help streamline common maintenance tasks and reduce the amount of time and effort required to manage the system.

By using these scripts, you can automate many routine tasks and simplify the process of updating, configuring, and managing the Attestation Suite. This can help to reduce the risk of errors and improve overall system stability and reliability.

Whether you need to update the system, or perform routine maintenance tasks, our scripts can help you to get the job done quickly and easily. We have taken care to ensure that our scripts are well-documented and easy to use, even for those who may not have extensive experience with the Attestation Suite or the underlying technologies.

- [Update](./../docs/installation/MaintenanceScripts.md#update)
- [Restart](./../docs/installation/MaintenanceScripts.md#restart)
- [Drop database](./../docs/installation/MaintenanceScripts.md#drop-database)


Full maintenance documentation is [here](./../docs/installation/MaintenanceScripts.md).

[Back to Home](./../README.md)

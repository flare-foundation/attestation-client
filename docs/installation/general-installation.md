# General Installation

## Supported systems

The Attestation Client package has been tested on the following platforms:

- UBUNTU 20.04
- WSL 0.2.1

## Modules

The Attestation Client package is divided into several standalone modules that can be installed on a single or multiple machines:

- [Indexer](./indexer-installation.md)
- [Attester Client](./attester-client-installation.md)
- [Alerts](./alerts-installation.md)
- [Back end](./backend-installation.md)

## Repositories

Attester Suite requires two GITHUB repositories:
- [Attester Suite](https://github.com/flare-foundation/attestation-client)
- [Multi Chain Client](https://github.com/flare-foundation/multi-chain-client)

Both repositories must be cloned into the same folder.

```bash
git clone https://github.com/flare-foundation/attestation-client.git
git clone https://github.com/flare-foundation/multi-chain-client.git


cd attester-client
yarn
yarn buildmcc
yarn link flare-mcc
yarn c
yarn build
```

## Local installation
```
./scripts/install.sh
```

## Remote installation from local repository

### Deploy repo on remote machine
```
mkdir -p tmp_data
git archive main | gzip > tmp_data/deploy.tgz
sudo scp -i ~/.ssh/id_ed25519 tmp_data/deploy.tgz ubuntu@<server>:~

cd ../multi-chain-client
mkdir -p tmp_data
git archive main | gzip > tmp_data/deploy-mcc.tgz
sudo scp -i ~/.ssh/id_ed25519 tmp_data/deploy-mcc.tgz ubuntu@<server>:~
```

To prepare on remote machine
```
mkdir -p attester-suite/base
mkdir -p attester-suite/multi-chain-client

cp deploy.tgz attester-suite/base
cp deploy-mcc.tgz attester-suite/multi-chain-client

cd attester-suite/base
tar xzf deploy.tgz

cd ../multi-chain-client
tar xzf deploy-mcc.tgz

cd ../base

```


## Services

All modules are run as services. Check [services](services.md) section for more details.

## General prerequisites

- NODE add version ....
- YARN
- MYSQL server
- ctail

Each prerequisite should be installed only once.

### NODE

For NODE installation use the following script:

```bash
sudo apt-get update
sudo apt install nodejs
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key --keyring /etc/apt/trusted.gpg.d/docker-apt-key.gpg add
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list

# to get latest version
sudo npm cache clean -f
sudo npm install -g n
sudo n stable
```

### YARN

YARN can be installed only after NODE.

For YARN installation use the following script:

```bash
sudo apt install npm
sudo npm install --global yarn
yarn --version
```

It might require new login for yarn to work.

### MYSQL server

#### Installation
````bash
sudo apt install mysql-server
sudo mysql_secure_installation
````

If you need remote access to the MYSQL you need to change MYSQL configuration file `/etc/mysql/mysql.conf.d/mysqld.cnf` line with value `bind-address` from `127.0.0.1` to `0.0.0.0`.
```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

After change you must restart MYSQL server.
```bash
sudo systemctl restart mysql
```

#### Setup Indexer

For security reasons two users are created. User with the write access is linked only to the local machine.

````sql
CREATE DATABASE indexer;

CREATE USER 'indexWriter'@'localhost' IDENTIFIED BY '.IndexerWriterPassw0rd';
GRANT ALL PRIVILEGES ON indexer.* TO 'indexWriter'@'localhost';

CREATE USER 'indexReader'@'%' IDENTIFIED BY '.IndexerReaderPassw0rd';
GRANT SELECT ON indexer.* TO 'indexReader'@'%';

FLUSH PRIVILEGES;
```

#### Setup Attester Client

For security reasons two users are created. User with the write access is linked only to the local machine.

````sql
CREATE DATABASE attester;

CREATE USER 'attesterWriter'@'localhost' IDENTIFIED BY '.AttesterWriterPassw0rd';
GRANT ALL PRIVILEGES ON attester.* TO 'attesterWriter'@'localhost';

CREATE USER 'attesterReader'@'%' IDENTIFIED BY '.AttesterReaderPassw0rd';
GRANT SELECT ON attester.* TO 'attesterReader'@'%';

FLUSH PRIVILEGES;
```

### ctail

Flare modules use specialized color tagged logs. To display them with colors use ctail.

To install ctail use:

``` bash
npm i -g ctail
```

[Back to Home](./../README.md)

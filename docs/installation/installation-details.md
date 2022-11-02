# Installation

## Supported systems

The Attestation Client package has been tested on the following platforms:

- UBUNTU 20.04
- WSL 0.2.1

## Installation

Simple installation instructions are [here](./general-installation.md).

## Modules

The Attestation Client package is divided into several standalone modules that can be installed on a single or multiple machines:

- [Indexer](./indexer-installation.md)
- [Attester Client](./attester-client-installation.md)
- [Alerts](./alerts-installation.md)
- [Back end](./backend-installation.md)


## Services

All modules are run as services. Check [services](services.md) section for more details.

## General prerequisites

- NODE add version ....
- YARN
- MYSQL server
- ctail

Each prerequisite should be installed only once.

### NODE

For NODE installation we use NVM to get specific version and allow multiple node version:

``` bash
sudo apt-get update
sudo apt install curl -y
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash
source ~/.profile 
nvm install 16.17.1
```

### YARN

YARN can be installed only after NODE.

For YARN installation use the following script:

``` bash
sudo apt install npm -y
sudo npm install --global yarn -y
source ~/.profile 
yarn --version
```

It might require new login for yarn to work.

### MYSQL server

#### Installation
```` bash
sudo apt install mysql-server -y
sudo mysql_secure_installation
````

If you need remote access to the MYSQL you need to change MYSQL configuration file `/etc/mysql/mysql.conf.d/mysqld.cnf` line with value `bind-address` from `127.0.0.1` to `0.0.0.0`.
``` bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Autoreplace 
```bash
sudo sed -i 's/^\s*bind-address\s*=\s*127.0.0.1/bind-address            = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf
```

After change you must restart MYSQL server.
``` bash
sudo systemctl restart mysql
```

#### Setup Indexer

For security reasons two users are created. User with the write access is linked only to the local machine.

``` sql
CREATE DATABASE indexer;

CREATE USER 'indexWriter'@'localhost' IDENTIFIED BY '.IndexerWriterPassw0rd';
GRANT ALL PRIVILEGES ON indexer.* TO 'indexWriter'@'localhost';

CREATE USER 'indexReader'@'%' IDENTIFIED BY '.IndexerReaderPassw0rd';
GRANT SELECT ON indexer.* TO 'indexReader'@'%';

FLUSH PRIVILEGES;
```

#### Setup Attester Client

For security reasons two users are created. User with the write access is linked only to the local machine.

``` sql
CREATE DATABASE attester;

CREATE USER 'attesterWriter'@'localhost' IDENTIFIED BY '.AttesterWriterPassw0rd';
GRANT ALL PRIVILEGES ON attester.* TO 'attesterWriter'@'localhost';
GRANT PROCESS ON *.* TO 'attesterWriter'@'localhost';

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

> ctail might require ccze
``` bash
sudo apt-get install ccze
```

[Back to Home](./../README.md)

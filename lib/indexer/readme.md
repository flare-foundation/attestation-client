# Indexer

Chain indexer for Attester Client.

## Options


## Compile
```
yarn
yarn build
```
## Database initialize

### SQLITE

Change in .deploy.env `DB_HOST_TYPE=sqlite`


### MYSQL

Change in .deploy.env `DB_HOST_TYPE=mysql`

```
sudo mysql
CREATE USER 'indexWriter'@'localhost' IDENTIFIED BY 'indexWriterPassw0rd';
CREATE DATABASE indexer;
GRANT ALL PRIVILEGES ON indexer.* TO 'indexWriter'@'localhost';

CREATE USER 'indexReader'@'%' IDENTIFIED BY 'another.password';
GRANT SELECT ON indexer.* TO 'indexReader'@'%';

FLUSH PRIVILEGES;

```
### POSTGRES
Change in .deploy.env `DB_HOST_TYPE=postgres`

## Start
### Production
Prerequisites: Compile, Database initialize
```
node dist/indexer/indexer.js
```

### Developer
Prerequisites: Compile, Database initialize
```
yarn devindexer
```

#### Debugging

Select `Launch indexer`


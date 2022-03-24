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

CREATE DATABASE indexer;

CREATE USER 'indexWriter'@'localhost' IDENTIFIED BY 'indexWriterPassw0rd';
GRANT ALL PRIVILEGES ON indexer.* TO 'indexWriter'@'localhost';

CREATE USER 'indexReader'@'%' IDENTIFIED BY 'another.password';
GRANT SELECT ON indexer.* TO 'indexReader'@'%';



CREATE DATABASE attester;

CREATE USER 'attesterWriter'@'localhost' IDENTIFIED BY 'attesterWriterPassw0rd!';
GRANT ALL PRIVILEGES ON attester.* TO 'attesterWriter'@'localhost';

CREATE USER 'attesterReader'@'%' IDENTIFIED BY 'another.Passw0rd';
GRANT SELECT ON attester.* TO 'attesterReader'@'%';


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



### Services

```
systemctl --user enable indexer-xrp.service
systemctl --user enable indexer-btc.service
systemctl --user enable indexer-ltc.service
systemctl --user enable indexer-algo.service
systemctl --user enable indexer-doge.service
```

```
systemctl --user start indexer-xrp.service
systemctl --user start indexer-btc.service
systemctl --user start indexer-ltc.service
systemctl --user start indexer-algo.service
systemctl --user start indexer-doge.service
```

```
systemctl --user stop indexer-xrp.service
systemctl --user stop indexer-btc.service
systemctl --user stop indexer-ltc.service
systemctl --user stop indexer-algo.service
systemctl --user stop indexer-doge.service
```

```
systemctl --user restart indexer-xrp.service
systemctl --user restart indexer-btc.service
systemctl --user restart indexer-ltc.service
systemctl --user restart indexer-algo.service
systemctl --user restart indexer-doge.service
```

```
journalctl --user -u indexer-xrp -f -n 1000
journalctl --user -u indexer-btc -f -n 1000
journalctl --user -u indexer-ltc -f -n 1000
journalctl --user -u indexer-algo -f -n 1000
journalctl --user -u indexer-doge -f -n 1000
```

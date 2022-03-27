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



CREATE DATABASE songbird_attester;

CREATE USER 'sgbAttesterWriter'@'localhost' IDENTIFIED BY 'xxx';
GRANT ALL PRIVILEGES ON songbird_attester.* TO 'sgbAttesterWriter'@'localhost';

CREATE USER 'sgbAttesterReader'@'%' IDENTIFIED BY 'xxx';
GRANT SELECT ON songbird_attester.* TO 'sgbAttesterReader'@'%';


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


#### Install services
```
systemctl --user daemon-reload

systemctl --user enable indexer-xrp.service
systemctl --user enable indexer-btc.service
systemctl --user enable indexer-ltc.service
systemctl --user enable indexer-algo.service
systemctl --user enable indexer-doge.service

systemctl --user enable coston-attester-client.service
systemctl --user enable coston-spammer.service
systemctl --user enable coston-backend.service

systemctl --user enable songbird-attester-client.service
systemctl --user enable songbird-spammer.service
systemctl --user enable songbird-backend.service


```

#### Start services
```
systemctl --user start indexer-xrp.service
systemctl --user start indexer-btc.service
systemctl --user start indexer-ltc.service
systemctl --user start indexer-algo.service
systemctl --user start indexer-doge.service

systemctl --user start coston-attester-client.service
systemctl --user start coston-spammer.service
systemctl --user start coston-backend.service

systemctl --user start songbird-attester-client.service
systemctl --user start songbird-spammer.service
systemctl --user start songbird-backend.service



```

#### Stop services
```
systemctl --user stop indexer-xrp.service
systemctl --user stop indexer-btc.service
systemctl --user stop indexer-ltc.service
systemctl --user stop indexer-algo.service
systemctl --user stop indexer-doge.service

systemctl --user stop coston-attester-client.service
systemctl --user stop coston-spammer.service
systemctl --user stop coston-backend.service

systemctl --user stop songbird-attester-client.service
systemctl --user stop songbird-spammer.service
systemctl --user stop songbird-backend.service

```

#### Restart services
```
systemctl --user restart indexer-xrp.service
systemctl --user restart indexer-btc.service
systemctl --user restart indexer-ltc.service
systemctl --user restart indexer-algo.service
systemctl --user restart indexer-doge.service

systemctl --user restart coston-attester-client.service
systemctl --user restart coston-spammer.service
systemctl --user restart coston-backend.service

systemctl --user restart songbird-attester-client.service
systemctl --user restart songbird-spammer.service
systemctl --user restart songbird-backend.service

```

#### View service log
```
journalctl --user -u indexer-xrp -f -n 1000
journalctl --user -u indexer-btc -f -n 1000
journalctl --user -u indexer-ltc -f -n 1000
journalctl --user -u indexer-algo -f -n 1000
journalctl --user -u indexer-doge -f -n 1000

journalctl --user -u coston-attester-client -f -n 1000
journalctl --user -u coston-spammer -f -n 1000
journalctl --user -u coston-backend -f -n 1000

journalctl --user -u songbird-attester-client -f -n 1000
journalctl --user -u songbird-spammer -f -n 1000
journalctl --user -u songbird-backend -f -n 1000

```

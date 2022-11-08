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

systemctl --user enable coston2-attester-client-c2.service
systemctl --user enable coston2-attester-client-c3.service
systemctl --user enable coston2-attester-client-c4.service
systemctl --user enable coston2-attester-client-c5.service

systemctl --user enable coston-attester-client-c2.service
systemctl --user enable coston-attester-client-c3.service
systemctl --user enable coston-attester-client-c4.service
systemctl --user enable coston-attester-client-c5.service




systemctl --user enable coston2-spammer-btc.service
systemctl --user enable coston2-spammer-ltc.service
systemctl --user enable coston2-spammer-xrp.service
systemctl --user enable coston2-spammer-algo.service
systemctl --user enable coston2-spammer-doge.service

systemctl --user enable coston-backend.service

systemctl --user enable songbird-attester-client.service
systemctl --user enable songbird-spammer.service
systemctl --user enable songbird-backend.service

systemctl --user enable attester-alerts


```

#### Start services

```
systemctl --user start indexer-xrp.service
systemctl --user start indexer-btc.service
systemctl --user start indexer-ltc.service
systemctl --user start indexer-algo.service
systemctl --user start indexer-doge.service

systemctl --user start coston-attester-client.service

systemctl --user restart coston2-spammer-btc.service
systemctl --user restart coston2-spammer-ltc.service
systemctl --user restart coston2-spammer-xrp.service
systemctl --user restart coston2-spammer-algo.service
systemctl --user restart coston2-spammer-doge.service

systemctl --user start coston-backend.service

systemctl --user start songbird-attester-client.service
systemctl --user start songbird-spammer.service
systemctl --user start songbird-backend.service

systemctl --user start attester-alerts



```

#### Stop services

```
systemctl --user stop indexer-xrp.service
systemctl --user stop indexer-btc.service
systemctl --user stop indexer-ltc.service
systemctl --user stop indexer-algo.service
systemctl --user stop indexer-doge.service

systemctl --user stop coston2-attester-client.service
systemctl --user stop coston2-attester-client-c2.service
systemctl --user stop coston2-attester-client-c3.service
systemctl --user stop coston2-attester-client-c4.service
systemctl --user stop coston2-attester-client-c5.service

systemctl --user stop coston-attester-client.service
systemctl --user stop coston-attester-client-c2.service
systemctl --user stop coston-attester-client-c3.service
systemctl --user stop coston-attester-client-c4.service
systemctl --user stop coston-attester-client-c5.service


systemctl --user stop coston-spammer-btc.service
systemctl --user stop coston-spammer-ltc.service
systemctl --user stop coston-spammer-xrp.service
systemctl --user stop coston-spammer-algo.service
systemctl --user stop coston-spammer-doge.service

systemctl --user stop coston-backend.service

systemctl --user stop songbird-attester-client.service
systemctl --user stop songbird-spammer.service
systemctl --user stop songbird-backend.service

systemctl --user stop attester-alerts


```

#### Restart services

```
systemctl --user restart indexer-xrp
systemctl --user restart indexer-btc
systemctl --user restart indexer-ltc
systemctl --user restart indexer-algo
systemctl --user restart indexer-doge

systemctl --user restart coston2-attester-client

systemctl --user restart coston2-attester-client
systemctl --user restart coston2-attester-client-c2.service
systemctl --user restart coston2-attester-client-c3.service
systemctl --user restart coston2-attester-client-c4.service
systemctl --user restart coston2-attester-client-c5.service

systemctl --user restart coston-attester-client.service
systemctl --user restart coston-attester-client-c2.service
systemctl --user restart coston-attester-client-c3.service
systemctl --user restart coston-attester-client-c4.service
systemctl --user restart coston-attester-client-c5.service


systemctl --user enable coston2-spammer-btc
systemctl --user enable coston2-spammer-xrp
systemctl --user enable coston2-spammer-ltc
systemctl --user enable coston2-spammer-doge

systemctl --user restart coston2-spammer-btc
systemctl --user restart coston2-spammer-xrp
systemctl --user restart coston2-spammer-ltc
systemctl --user restart coston2-spammer-doge

journalctl --user -u coston2-spammer-btc -f -n 1000





systemctl --user restart coston-spammer-btc.service
systemctl --user restart coston-spammer-ltc.service
systemctl --user restart coston-spammer-xrp.service
systemctl --user restart coston-spammer-algo.service
systemctl --user restart coston-spammer-doge.service

systemctl --user restart coston-backend

systemctl --user restart songbird-attester-client
systemctl --user restart songbird-spammer
systemctl --user restart songbird-backend

systemctl --user restart attester-alerts


```

#### View service log

```
journalctl --user -u indexer-xrp -f -n 1000
journalctl --user -u indexer-btc -f -n 1000
journalctl --user -u indexer-ltc -f -n 1000
journalctl --user -u indexer-algo -f -n 1000
journalctl --user -u indexer-doge -f -n 1000

journalctl --user -u coston2-attester-client -f -n 1000


journalctl --user -u coston-attester-client -f -n 1000
journalctl --user -u coston-attester-client-c2 -f -n 1000
journalctl --user -u coston-attester-client-c3 -f -n 1000
journalctl --user -u coston-attester-client-c4 -f -n 1000
journalctl --user -u coston-attester-client-c5 -f -n 1000

journalctl --user -u coston-spammer-btc -f -n 1000
journalctl --user -u coston-spammer-ltc -f -n 1000
journalctl --user -u coston-spammer-xrp -f -n 1000
journalctl --user -u coston-spammer-doge -f -n 1000
journalctl --user -u coston-spammer-algo -f -n 1000

journalctl --user -u coston-backend -f -n 1000

journalctl --user -u songbird-attester-client -f -n 1000
journalctl --user -u songbird-spammer -f -n 1000
journalctl --user -u songbird-backend -f -n 1000


journalctl --user -u attester-alerts -f -n 1000

```

Check logs with ctail
Next scripts must be run from the user home (/home/ubuntu).

```
ctail -f -i global/indexer/logs/attester-XRP.log
ctail -f -i global/indexer/logs/attester-BTC.log
ctail -f -i global/indexer/logs/attester-LTC.log
ctail -f -i global/indexer/logs/attester-ALGO.log
ctail -f -i global/indexer/logs/attester-DOGE.log


ctail -f -i coston/attester-client/logs/attester-global.log

ctail -f -i coston/spammer/logs/attester-btc.log
ctail -f -i coston/spammer/logs/attester-ltc.log
ctail -f -i coston/spammer/logs/attester-xrp.log
ctail -f -i coston/spammer/logs/attester-algo.log
ctail -f -i coston/spammer/logs/attester-doge.log

ctail -f -i coston/backend/logs/attester-global.log

ctail -f -i songbird/attester-client/logs/attester-global.log
ctail -f -i songbird/spammer/logs/attester-global.log
ctail -f -i songbird/backend/logs/attester-global.log

ctail -f -i global/alerts/logs/attester-global.log
```

### Deploy all

```

./scripts/deploy-indexer
./scripts/deploy-alerts

./scripts/deploy-coston-attester
./scripts/deploy-coston-spammer
./scripts/deploy-coston-backend

./scripts/deploy-songbird-attester
./scripts/deploy-songbird-spammer
./scripts/deploy-songbird-backend

```


# multipass setup (windows)
```bash
multipass launch --name p1 --disk 100G --cpus 4 --mem 8G
multipass launch --name p2 --disk 100G --cpus 4 --mem 8G

multipass shell p1
multipass shell p2
```


```
multipass delete p1
multipass purge
multipass launch --name p4 --cpus 8 --mem 8GB --disk 80GB
multipass shell p4
```

# SSH setup 
P1
```bash
mkdir -p $HOME/.ssh
chmod 0700 $HOME/.ssh
ssh-keygen
cat .ssh/id_rsa.pub
```

P2
```bash
mkdir -p $HOME/.ssh
chmod 0700 $HOME/.ssh
ssh-keygen
nano .ssh/authorized_keys

hostname -I
```





# Flare Node upgrade to version v0.5.3

IMPORTANT: This script is intended for old nodes with LevelDB.

Official Flare Instructions
https://github.com/flare-foundation/flare.git

```
+-[root] <start script from here>
|
+---[flare] <old Flare version>
|
+-+-[flare-new]
  |
  +---[flare] <here will a new git repository be downloaded before put into place>
```



Jump to 'Just give me script' :D


## Details


Install go version 1.17.7
```
gvm install go1.17.7
```

Make new folder
```
mkdir flare-new
cd flare-new
```

Get new flare
```
git clone https://github.com/flare-foundation/flare.git
```


Build
```
cd flare
gvm use go1.17.7
./scripts/build.sh
```

Create configuration file
```
mkdir chain-config
nano chain-config/songbird.json
```

content:
```
{
 "snowman-api-enabled": false,
 "coreth-admin-api-enabled": false,
 "eth-apis": [
  "public-eth",
  "public-eth-filter",
  "net",
  "web3",
  "internal-public-eth",
  "internal-public-blockchain",
  "internal-public-transaction-pool"
 ],
 "rpc-gas-cap": 50000000,
 "rpc-tx-fee-cap": 100,
 "pruning-enabled": false,
 "local-txs-enabled": false,
 "api-max-duration": 0,
 "api-max-blocks-per-request": 0,
 "allow-unfinalized-queries": false,
 "allow-unprotected-txs": false,
 "remote-tx-gossip-only-enabled": false,
 "log-level": "debug"
}
```



Create launch file
```
nano songbird.sh
```

Content:
```
#!/bin/bash

# (c) 2021, Flare Networks Limited. All rights reserved.
# Please see the file LICENSE for licensing terms.

if [[ $(pwd) =~ " " ]]; then echo "Working directory path contains a folder with a space in its name, please remove all spaces" && exit; fi
if [ -z ${GOPATH+x} ]; then echo "GOPATH is not set, visit https://github.com/golang/go/wiki/SettingGOPATH" && exit; fi
printf "\x1b[34mSongbird Canary Network Deployment\x1b[0m\n\n"

LAUNCH_DIR=$(pwd)
DB_TYPE=leveldb

# NODE 1
printf "Launching Songbird Node at 127.0.0.1:9650\n"

nohup ./build/flare --network-id=songbird \
 --http-host= \
 --public-ip=127.0.0.1 \
 --http-port=9650 \
 --log-dir=$LAUNCH_DIR/logs/songbird/node1 \
 --db-dir=$LAUNCH_DIR/db/songbird/node1 \
 --bootstrap-ips="$(curl -m 10 -sX POST --data '{ "jsonrpc":"2.0", "id":1, "method":"info.getNodeIP" }' -H 'content-type:application/json;' https://songbird.flare.network/ext/info | jq -r ".result.ip")" \
 --bootstrap-ids="$(curl -m 10 -sX POST --data '{ "jsonrpc":"2.0", "id":1, "method":"info.getNodeID" }' -H 'content-type:application/json;' https://songbird.flare.network/ext/info | jq -r ".result.nodeID")" \
 --db-type=$DB_TYPE \
 --chain-config-dir=$LAUNCH_DIR/chain-config \
 --log-level=debug > /dev/null 2>&1 &
NODE_PID=`echo $!`

printf "Songbird node successfully launched on PID: ${NODE_PID}"
```


Give `songbird.sh` executive priviledges
```
chmod +x songbird.sh
```

Kill old node
```
ps -aux | grep ava
```
Get id from avalanche process
```
kill -2 <id>
```

Make new structure
```
cd ../..
mv flare flare-old
mv flare-new/flare flare
```

Move data
```
mv flare-old/db flare/db
```

Rename fuji into songbird
```
mv flare/db/songbird/node1/fuji flare/db/songbird/node1/songbird
```


Run new node
```
cd flare
./songbird.sh
```







## Just script

Get avalance process ID (keep it running) and use it as parameter for next script:
```
ps -aux | grep ava
```


You must be in folder where you have `flare` folder with the old version

```
#!/bin/bash

# (c) 2021, Flare Networks Limited. All rights reserved.
# Please see the file LICENSE for licensing terms.

gvm install go1.17.7
mkdir flare-new
cd flare-new
git clone https://github.com/flare-foundation/flare.git
cd flare

gvm use go1.17.7
./scripts/build.sh
mkdir chain-config
nano chain-config/songbird.json
nano songbird.sh
chmod +x songbird.sh

cd ../..
kill -2 %1
mv flare flare-old
mv flare-new/flare flare
mv flare-old/db flare/db
mv flare/db/songbird/node1/fuji flare/db/songbird/node1/songbird

cd flare
./songbird.sh
```




# Spammer local node installation and run
Written on `18/2/2022` by `David` for Flare node version `0.5.3`

To run spammer you need to run local node.

## Prerequisits

To install local node you need to have `gvm` (go version manager) installed and `go` version `1.17.5`.

### Install gvm
```
bash < <(curl -s -S -L https://raw.githubusercontent.com/moovweb/gvm/master/binscripts/gvm-installer)
sudo apt -y install gcc g++ curl jq
sudo apt-get install bison
sudo apt-get install golang-go
sudo npm install gvm
```

### Install go1.17.5
```
gvm install go1.17.5
```

## Install local node

To install flare local node open new terminal and run next commands:

```
mkdir .node -p
cd .node
git clone https://github.com/flare-foundation/flare.git
cd flare
git checkout v0.5.3
gvm use go1.17.5
./scripts/build.sh

cp ../../lib/spammer/flarelocalnode/scdev.json .
cp ../../lib/spammer/flarelocalnode/launch_localnet_scdev.sh ./scripts

chmod +x ./scripts/launch_localnet_scdev.sh

# deploying state connector
```

## Running local node
Open new terminal and run next commands:
```
cd ./.node/flare
./scripts/launch_localnet_scdev.sh
```
Do not close the teminal.

### Install State Connector
Run local node and wait until it is healthy `http://127.0.0.1:9650/ext/health`.

Open new terminal window and run state connector deployment:
```
yarn stateconnector
```



## Running Spammer

```
```
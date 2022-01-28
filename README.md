# *Flare Network* attester client

## Prepare scdev node

Pull repo: https://gitlab.com/flarenetwork/flare

Follow the instructions for prerequisites.

Compile with:

```
./compile.sh scdev
```

Run: 

```
./cmd/local.sh 
```

## Deploying contract

Deploy `StateConnector.sol` to scdev network::

```
yarn stateconnector
```
The address of the deployed contract appears in the file `.stateconnector-address`.

## Run spammer

```
./scripts/run-attester-spammer-XRP.sh
```

This spammer is adapted for scdev chain.

Instead of XRP, one can use BTC, LTC or DOGE.

## Running attester client


## Configuring Local Mcc

1. Make sure this repo and attester-client repo are in the same root
2. If you make changes to MCC make sure to rebuild it `yarn build` (in MCC project)
3. Rebuild the local dependency in attester client with `yarn install --force`

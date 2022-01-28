# *Flare Network* attester client

## For developers

Install 
- typelens - get references above functions
- Visual Studio IntelliCode - more friendly assistance
- Move TS - if moving files does not relink imports


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


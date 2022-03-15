# *Flare Network* attester client

Attester client is a piece of software that is used for attestation of requests for confirming data from other chains and other sources.
It consists of several pieces.
- Chain indexers
- Attestation client
- Utilities for testing.

The project depends on the library/project MCC (MultiChain Client), that is used for interacting to other supported chains.

## Indexer

*Indexer* connects to a specific blockchain and reads blocks and transactions for certain part of the history, usually extending from now to 
few days ago, allowing unified view for queries for attestation client.


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


## Configuring Local Mcc

1. Make sure this repo and attester-client repo are in the same root
2. If you make changes to MCC make sure to rebuild it `yarn build` (in MCC project)
3. Rebuild the local dependency in attester client with `yarn install --force`

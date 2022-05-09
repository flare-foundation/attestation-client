# For developers

Install the following VS Code packages:

- `typelens`: Get references above functions
- `Visual Studio IntelliCode`: More friendly assistance
- `Move TS`: If moving files does not relink imports

## Prepare scdev node

Pull repo: https://gitlab.com/flarenetwork/flare

Follow the instructions for prerequisites.

Compile with:

``` bash
./compile.sh scdev
```

Run:

``` bash
./cmd/local.sh
```

## Deploying contract

Deploy `StateConnector.sol` to scdev network:

``` bash
yarn stateconnector
```

The address of the deployed contract appears in the file `.stateconnector-address`.

## Run spammer

``` bash
./scripts/run-attester-spammer-XRP.sh
```

This spammer is adapted for scdev chain.

Instead of XRP, one can use BTC, LTC or DOGE.

## Running attester client

## Configuring Local MCC

1. Make sure this repo and attester-client repo are in the same root
2. If you make changes to MCC make sure to rebuild it `yarn build` (in MCC project)
3. Rebuild the local dependency in attester client with `yarn install --force`

## How to verify the contract

For this process you will need:

- Flattened solidity code of contract
- Know exact solidity compiler config
  - Usually optimization is set to true and to do 200 rounds

After deployment:

- Navigate to chain explorer
- Open code window
- Click on Validate button
- Follow the rules on screen

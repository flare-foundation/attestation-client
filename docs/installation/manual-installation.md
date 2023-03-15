# Manual installation (without dockers)

- install repository
```
cd ~
mkdir -p attestation-suite
cd attestation-suite

git clone https://gitlab.com/flarenetwork/attestation-client.git
cd attestation-client

git checkout manual-install
```

- install dependencies: command `./scripts/direct-install/install-dependencies.sh`

- login again

- compile project: command `./scripts/direct-install/.sh`

- initialize credentials: command `./scripts/direct-install/initialize-credentials.sh`. IMPORTANT: this overwrites all credentials (so don't run it again) 
- copy configurations: command `cp configs/.install/configurations.json credentials/`

- update credentials keys
    - `credentials/networks-credentials.json`
        - `PrivateKey` insert your private key
        - add key `Network` with value `coston2`
    - `credentials/chain-credentials.json`
        - `BTCURL` to `http://localhost:18332`
        - `XRLURL` to `http://localhost:11234` 
        - `DOGEURL` to `http://localhost:44555`
        - make sure all but XRPPasswords are the same
    - `credentials/database-credentials.json`
        - all `*DatabaseHost` must be `localhost`
        - all `database`, `username` must be preponed with chain name. Example:
        ```
        "BTCIndexerDatabase":"btc_indexer",
        "BTCIndexerWriterUsername":"btc_indexerWriter",
        "BTCIndexerReaderUsername":"btc_indexerReader",
        ```
    - `credentials/verifier-server-credentials.json` change like this:
    ```
    "XRPVerifierRouterServerPort": "9501",
    "DOGEVerifierRouterServerPort": "9504",    
    ```
- update credentials passwords in `credentials/configurations.json` (all keys `credentials`)
- prepare credentials: command `./scripts/direct-install/prepare-credentials.sh` 
    - use this command whenever you change something in credentials (and restart services after)

- install: command `./scripts/direct-install/install.sh`

- restart all services: command `./scripts/direct-install/services-restart-all.sh`
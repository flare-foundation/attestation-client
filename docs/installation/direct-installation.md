# Direct installation to a Linux machine

Here is bullet like summary for direct installation.
Linux Ubuntu 20.04 and user `ubuntu` are assumed.
The installation installs several attestation suite services, which are run as systemd services.

- Install repository
```
cd ~
mkdir -p attestation-suite
cd attestation-suite

git clone https://gitlab.com/flarenetwork/attestation-client.git
cd attestation-client

git checkout main
```

- Install dependencies: command `./scripts/install-dependencies.sh`

- Logout and login again.

- Compile the project: command `./scripts/compile.sh`

- Initialize credentials: command `./scripts/install-credentials.sh`. IMPORTANT: this overwrites all credentials (so don't run it again).

- Copy configurations: command `cp configs/.install/configurations.json credentials/`.

- Update credentials keys
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
- Update credentials passwords in `credentials/configurations.json` (all keys `credentials`)
- Prepare credentials: command `./scripts/prepare-credentials.sh` 
    - Use this command whenever you change something in credentials (and restart services after)

- Install: command `./scripts/install.sh`

- Restart all services: command `./scripts/services-restart-all.sh`
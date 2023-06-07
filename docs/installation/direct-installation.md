# Direct installation to a Linux Machine

Here is a summary for direct installation.
Linux Ubuntu 20.04 and user `ubuntu` are assumed.
The installation installs several attestation suite services, which are run as systemd services.

- Install repository:

    ```bash
    cd ~
    mkdir -p attestation-suite
    cd attestation-suite

    git clone git@github.com:flare-foundation/attestation-client.git
    cd attestation-client

    # use relevant branch or tag instead of 'main'
    git checkout main

    ```

- Install dependencies command: `./scripts/direct-install/install-dependencies.sh`

- Compile the project command: `./scripts/compile/.sh` (It must compile for the next command to work.)

- Initialize credentials command: `./scripts/direct-install/initialize-credentials.sh`. IMPORTANT: this overwrites all credentials (so don't run it again).
- Copy configurations commands: `cp configs/.install/configurations.json credentials/`

- Update credentials keys:

    - `credentials/networks-credentials.json`
        - `PrivateKey` Insert your private key.
        - Add key `Network` with value `coston2`
    - `credentials/chain-credentials.json`
        - `BTCURL` to `http://localhost:18332`
        - `XRLURL` to `http://localhost:11234`
        - `DOGEURL` to `http://localhost:44555`
        - Make sure all but XRP passwords are the same.
    - `credentials/database-credentials.json`
        - All `*DatabaseHost` must be `localhost`
        - All `database`, `username` must be prepended with the chain name. Examples:

            ```json
            "BTCIndexerDatabase":"btc_indexer",
            "BTCIndexerWriterUsername":"btc_indexerWriter",
            "BTCIndexerReaderUsername":"btc_indexerReader",
            ```

    - `credentials/verifier-server-credentials.json` change like this:

        ```json
        "XRPVerifierRouterServerPort": "9501",
        "DOGEVerifierRouterServerPort": "9504",
        ```

- Update credentials passwords in `credentials/configurations.json` (all keys `credentials`).
- Prepare credentials command: `./scripts/direct-install/prepare-credentials.sh`. Use this command whenever you change something in credentials. Restart services after.

- Install command: `./scripts/direct-install/install.sh`<!--Need one more answer (about these 2 lines from DavidP: https://flarenetworks.slack.com/archives/C02NURDPAQZ/p1684868796516599 -->

- Restart all services command: `./scripts/direct-install/services-restart-all.sh`

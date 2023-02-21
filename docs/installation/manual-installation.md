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

- initialize credentials: command `./scripts/install-credentials.sh`. IMPORTANT: this overwrites all credentials (so don't run it again)
- update credentials keys
    - `credentials/network-credentials.json`
        - `PrivateKey` insert your private key
    - `credentials/chain-credentials.json`
        - `BTCURL` to `http://localhost:11234`
        - `XRLURL` to `http://localhost:11234` 
        - `DOGEURL` to `http://localhost:44555`
        - make sure all but XRPPasswords are the same
    - `credentials/database-credentials.json`
        - all `*DatabaseHost` must be `localhost`
- update credentials passwords in `credentials/configurations.json` (all keys `credentials`)
- prepare credentials: command `./scripts/prepare-credentials.sh` 
    - use this command whenever you change something in credentials (and restart services after)

- install: command `./scripts/install.sh`
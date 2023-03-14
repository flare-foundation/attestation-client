# Configuration system

Configuration system for attestation suite consists of configuration templates and credential files.
Configuration templates consist of a prescribed folder structure and template configuration files with prescribed names. Credential files contains key value pairs.
Template structure is defined in folder [`configs/.install/templates`](../../configs/.install/templates/).

Each attestation suite service expects the credential package and `templates` folder on the path defined in environment variable `SECURE_CONFIG_PATH`.
When started the service finds the credential package and the configuration on the service specific relative path.

Credential packed consists of two files:
- `credentials.json.secure` - encrypted credentials (in form key-value pare, where keys are stub names),
- `credentials.key` - instructions how to obtain the decryption key (e.g. use a path on cloud secret manager to obtain a decryption key).

Note that the configurations in `configs/.install/templates` (default location) are default templates. 
A user can copy the `templates` folder to another location, set `SECURE_CONFIG_PATH` to point to that location and adapt configurations. Files that are not found in user specified location will be searched for in default location.

The secret credentials in the configuration templates are indicated by stub identifier keys of the form `$(<stub_name>)`. 
On a startup, each attestation suite service loads the relevant `*-config.json` configuration file from the service specific relative path in `templates` folder. Credentials are injected from credential package.
Then the credentials matching the stubs are rendered into configuration files in-memory.

When installing services in a production environment, preparation of credentials is needed in advance of deployment. For extra secure reasons, the preparation should be done on separate, more secure machine. The preparation procedure is described in [deployment instructions](../../deployment/README.md).
It basically consists of making the following by running a few scripts:
- `scripts/install-credentials.sh` will create folder `credentials` and copy all credentials files from 
- `scripts/prepare-credentials.sh`


- Creating separate credentials folder.
- Copying `./configs/.install/template` folder to a `templates` folder in the credentials folder.
- Copying all `*-credentials.json` files from `./configs/.install` folder to the credentials folder. These files contain credential stub key definitions which should be manually entered into those files.
- `configurations.json` file is also copied to the credentials folder. This file can be used to define the encryption key handling procedure.
- a script is run, to prepare encrypted credentials that can be moved to the deployment machine to a specific folder to which the environment variable `SECURE_CONFIG_PATH` should be set onto the copied folder.

## Structure of `templates` folder

All JSON configuration files in templates are in a JSON format that support comments.

Folders:
- `indexer`: indexer configurations.
  - Contains indexer configurations, files of the form `<source>-indexer-config.json` where source is the indicator of the source in lowercase letters (e.g. `btc`, `xrp`, etc.). 
  - Property description: [IndexerConfig](../../src/indexer/IndexerConfig.ts).
  - Example: [`btc-indexer-config.json`](../../configs/.install/templates/indexer/btc-indexer-config.json).
- `spammer`: spammer configurations. **Not used in standard attestation suite deployment.**
  - Contains spammer configurations, files of the form `<source>-spammer-config.json` where `source` is the indicator of the data source in lowercase letters (e.g. `btc`, `xrp`, etc.). 
  - Property description: [SpammerConfiguration](../../src/spammer/SpammerConfiguration.ts).
  - Example: [`btc-indexer-config.json`](../../configs/.install/templates/spammer/btc-spammer-config.json).
  - Spammers are used to simulate sending attestation requests that are based on already indexed data.
- `sql`: SQL scripts for initialization of the indexer database ([prepareIndexer.sql](../../configs/.install/templates/sql/prepareIndexer.sql)) and attestation client database ([prepareAttestationClient.sql](../../configs/.install/templates/sql/prepareIndexer.sql))indexer configurations, files of the form `<source>-indexer-config.json` where `source` is the indicator of the data source in lowercase letters (e.g. `btc`, `xrp`, etc.). 
- `verifier-client`: verifier route configurations for different rounds.
   - Contains verifier route configurations in the files with the names in the form `verifier-routes-<startRoundId>-config.json`, where `startRoundId` indicates the round id from which the configuration with the next higher `startRoundId` overrides it.
   - Property description: [VerifierRouteConfig](../../src/verification/routing/configs/VerifierRouteConfig.ts).
   - Example: [`verifier-routes-150-config.json`](configs/.install/templates/verifier-client/verifier-routes-150-config.json).   
- `verifier-server`: verifier server configurations.
  - Contains verifier route configurations in file with the names in the form  `<source>-verifier-config.json` where source is the indicator of the source in lowercase letters (e.g. `btc`, `xrp`, etc.). 
  - Property description: [VeriferServerConfig](../../src/servers/verifier-server/src/config-models/VerifierServerConfig.ts).
  - Example: [`btc-verifier-config.json`](../../configs/.install/templates/verifier-server/btc-verifier-config.json).

In addition to configurations in the folders stated above, there are the following configuration files in the `templates` folder:
- `attester-config.json`: attestation client configuration.
  - Property description: [AttestationClientConfig](../../src/attester/configs/AttestationClientConfig.ts).
  - Example: [attester-config.json](../../configs/.install/templates/attester-config.json).
- `webserver-config.json`: attestation web server configuration.
  - Property description: [WebserverConfig](../../src/servers/web-server/src/config-models/WebserverConfig.ts).
  - Example: [webserver-config.json](../../configs/.install/templates/webserver-config.json).
- `monitor-config.json`: attestation suite monitor configuration.
  - Containes definitions for monitoring status and performance metrics for all Attestation Suite modules.
  - Property description: [TBD]
  - Example: [monitor-config.json](../../configs/.install/templates/monitor-config.json)
  





# Configuration system

Configuration system for attestation suite consists of configuration templates and credential files.
Configuration templates consist of a prescribed folder structure and template configuration files with prescribed names.
Template structure is defined in folder `configs/.install/templates`.

Each attestation suite service expects the `templates` folder on path defined in environment variable `SECURE_CONFIG_PATH`.
Then the prescribed relative path and expected file names are used for obtaining relevant configurations.

Note that the templates in `configs/.install/templates` are basic templates. 
A user can copy those templates to its own folder on `SECURE_CONFIG_PATH` and adapt them. But for the purpose of security the 
secret credentials in templates are indicated buy stub identifier keys of the form `$<stub_name>`. 
An attestation suite service on startup typically loads the relevant `.json` configuration file from the service specific relative path in `template` folder, and expects two more files in the same folder:
- `credentials.json.secure` - encrypted credentials (in form key-value pare, where keys are stub names),
- `credentials.key` - instructions how to obtain the decryption key (e.g. use a path on cloud secret manager to obtain a decryption key).
Then the credentials matching the stubs are rendered into configuration files in-memory.

When installing services in production environment, preparation of credentials is needed in advance of deployment. For extra secure reasons, the preparation can be done on separate more secure machine. The preparation procedure is described in [deployment instructions](../../deployment/README.md).
It basically consists of making the following by running a few scripts:
- creating separate credentials folder
- copying `./configs/.install/template` folder to a `templates` folder in the credentials folder
- copying all `*-credentials.json` files from `./configs/.install` folder to the credentials folder. 
- those files contain credential stub definitions which should be manually entered into those files
- `configurations.json` file is also copied to the credentials folder. This file can be used to define the encryption key handling procedure.
- a script is run, to prepare encrypted credentials that can be moved to the deployment machine to a specific folder to which the environment variable `SECURE_CONFIG_PATH` should be set onto the copied folder.

## Structure of `templates` folder

All JSON configuration files in templates are in a JSON format that support comments.

Folders:
- `indexer`: indexer configurations.
  - Contains indexer configurations, files of the form `<source>-indexer-config.json` where source is the indicator of the source in lowercase letters (e.g. `btc`, `xrp`, etc.). 
  - Property description: [IndexerConfig](../../src/indexer/IndexerConfig.ts)
  - Example: [`btc-indexer-config.json`](../../configs/.install/templates/indexer/btc-indexer-config.json)
- `spammer`: spammer configurations.
  - Contains spammer configurations, files of the form `<source>-spammer-config.json` where source is the indicator of the source in lowercase letters (e.g. `btc`, `xrp`, etc.). 
  - Property description: [IndexerConfig](../../src/indexer/IndexerConfig.ts)
  - Example: [`btc-indexer-config.json`](../../configs/.install/templates/indexer/btc-indexer-config.json)
  - Not used in standard attestation suite deployement. Spammers are used to simulate sending attestation requests that are based on already indexed data.
- `sql`: SQL scripts for initialization of the indexer database ([prepareIndexer.sql](../../configs/.install/templates/sql/prepareIndexer.sql)) and attestation client database ([prepareAttestationClient.sql](../../configs/.install/templates/sql/prepareIndexer.sql))indexer configurations, files of the form `<source>-indexer-config.json` where source is the indicator of the source in lowercase letters (e.g. `btc`, `xrp`, etc.). 
- `verifier-client`: verifier route configurations for different rounds.
   - Contains verifier route configurations in the files with the names in the form `verifier-routes-<startRoundId>-config.json`, where `startRoundId` indicates the round id from which the configuration with the next higher `startRoundId` overrides it.
- `verifier-server`: verifier server configurations.
  - Contains verifier route configurations in file with the names in the form  `<source>-verifier-config.json` where source is the indicator of the source in lowercase letters (e.g. `btc`, `xrp`, etc.). 
  - Property description: [VerifierRouteConfig](../../src/verification/routing/configs/VerifierRouteConfig.ts)
  - Example: [`btc-verifier-config.json`](../../configs/.install/templates/verifier-server/btc-verifier-config.json)
  
In addition to configurations in folders, there are the following configuration files in the `templates` folder:
- `attester-config.json`: attestation client configuration.
  - Property description: [AttestationClientConfig](../../src/attester/configs/AttestationClientConfig.ts)
  - Example: [attester-config.json](../../configs/.install/templates/attester-config.json)
- `webserver-config.json`: attestation web server configuration.
  - Property description: [WebserverConfig](../../src/servers/web-server/src/config-models/WebserverConfig.ts)
  - Example: [attester-config.json](../../configs/.install/templates/webserver-config.json)






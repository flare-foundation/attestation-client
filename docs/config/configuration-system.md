# Configuration System

The configuration system for the attestation suite consists of credential files and configuration templates:

- A **credential file** is a file of the form `<name>-credentials.json`. where `name` indicates the attestation suite service for which the configuration is intended. Credential files contain secret credentials in key-value pair format, each credential identified by its identifier key. Examples of all such files are in the `configs/.install` folder.
- A **configuration template** is a JSON file with a prescribed name of the form `<config_name>-config.json`, where `config_name` indicates the attestation suite service for which the configuration is intended. Configuration templates are organized in the prescribed folder structure, see [`configs/.install/templates`](../../configs/.install/templates/).

Credential files make up a **credential package** and consist of two files:

- `credentials.json.secure` - Encrypted credentials in the form of key-value pairs, where keys are stub names.
- `credentials.key` - Instructions on how to obtain the decryption key (e.g., use a path on Cloud Secret Manager to obtain a decryption key).

## How the Files and Template Work Together

Each attestation suite service expects the credential package and `templates` folder on the path defined in the environment variable `SECURE_CONFIG_PATH`.
If a configuration template is not specified, the default template on the same path relative to `configs/.install/templates` is used.

In place of credentials, configuration templates contain stub identifier keys of the form `$(<credential_identifier_key>)`, where `<credential_identifier_key>` represents a key in exactly one of the credential files.
Credential files are used in the process of building a credentials package, usually on a secure machine.
A **top level configuration file** [`configurations.json`](../../configs/.install/configurations.json) defines instructions on how the credential packages and the corresponding template folders get generated and what encryption to use.
The built credential packages and templates are then moved to a production machine, where they are used by the specified attestation suite service.

On startup, each attestation suite service loads the identifier key stubs from the credentials package. This is done in-memory.

The process of preparing credentials and building credentials packages is described in [deployment instructions](../../deployment/README.md).

## Structure of the `templates` Folder

All configuration templates are in a JSON format that supports comments.

Folders:

- `indexer` configurations:
    - Contains indexer configurations, files of the form `<source>-indexer-config.json` where source is the indicator of the source in lowercase letters (e.g. `btc`, `xrp`, etc.).
    - Property description: [IndexerConfig](../../src/indexer/IndexerConfig.ts).
    - Example: [`btc-indexer-config.json`](../../configs/.install/templates/indexer/btc-indexer-config.json).
- `spammer` configurations: **Not used in standard attestation suite deployment.**
    - Contains spammer configurations, files of the form `<source>-spammer-config.json` where `source` is the indicator of the data source in lowercase letters (e.g. `btc`, `xrp`, etc.).
    - Property description: [SpammerConfiguration](../../src/spammer/SpammerConfiguration.ts).
    - Example: [`btc-indexer-config.json`](../../configs/.install/templates/spammer/btc-spammer-config.json).
    - Spammers are used to simulate sending attestation requests that are based on already indexed data.
- `sql`: SQL scripts for initialization of the indexer database ([prepareIndexer.sql](../../configs/.install/templates/sql/prepareIndexer.sql)) and attestation client database ([prepareAttestationClient.sql](../../configs/.install/templates/sql/prepareIndexer.sql))indexer configurations, files of the form `<source>-indexer-config.json` where `source` is the indicator of the data source in lowercase letters (e.g. `btc`, `xrp`, etc.).
- `verifier-client`: Verifier route configurations for different rounds:
    - Contains verifier route configurations in the files with the names in the form `verifier-routes-<startRoundId>-config.json`, where `startRoundId` indicates the round id from which the configuration with the next higher `startRoundId` overrides it.
    - Property description: [VerifierRouteConfig](../../src/verification/routing/configs/VerifierRouteConfig.ts).
    - Example: [`verifier-routes-150-config.json`](configs/.install/templates/verifier-client/verifier-routes-150-config.json).
- `verifier-server`: verifier server configurations.
    - Contains verifier route configurations in file with the names in the form `<source>-verifier-config.json` where source is the indicator of the source in lowercase letters (e.g. `btc`, `xrp`, etc.).
    - Property description: [VeriferServerConfig](../../src/servers/verifier-server/src/config-models/VerifierServerConfig.ts).
    - Example: [`btc-verifier-config.json`](../../configs/.install/templates/verifier-server/btc-verifier-config.json).

In addition to configurations in the folders listed above, there are the following configuration files in the `templates` folder:

- `attester-config.json`: Attestation client configuration:
    - Property description: [AttestationClientConfig](../../src/attester/configs/AttestationClientConfig.ts).
    - Example: [attester-config.json](../../configs/.install/templates/attester-config.json).
- `webserver-config.json`: Attestation web server configuration:
    - Property description: [WebserverConfig](../../src/servers/web-server/src/config-models/WebserverConfig.ts).
    - Example: [webserver-config.json](../../configs/.install/templates/webserver-config.json).
- `monitor-config.json`: Attestation suite monitor configuration:
    - Contains definitions for monitoring status and performance metrics for all Attestation Suite modules.
    - Property description: [MonitorConfiguration](../../src/monitor/MonitorConfiguration.ts)
    - Example: [monitor-config.json](../../configs/.install/templates/monitor-config.json)

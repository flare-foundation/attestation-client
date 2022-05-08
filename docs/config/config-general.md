# Configuration

All *Attestation Suite* modules configuration is done via `json` configuration files.

Configuration files are separated in two ways:
- configuration
- credentials

Configuration files are deployed with deployment script while credential files are copied from server.

It is done this was so that your credentials are never reveled and resign only on a server.

To separate configuration files by function the configuration files are named `something-config.json` and the credential files are named `something-credential.json`.

## Location

All configuration (configuration and credentials) files are located in `<installation folder>/configs/prod` for production and `<installation folder>/configs/dev` for development.

Deployment credential files are located in `<installation folder>/../.config/`. 

> **IMPORTANT** on deployment the credential files from deployment overwrite all existing `<installation folder>/configs/prod` files.

> **IMPORTANT** deployment credential files MUST exist before deployment.

## **json** Special

For ease of use we added in **json** configuration ability to use EOL and multi line comments and the ability to ignore ending commas.

Example:
```json
{
    // values with default values are optional and are by default commented (this is an EOL comment)
    //"default setting" : 15,

    "test" : 15, 

    /* this is 
    a multiline 
    comment 
    */

    "End comma is ignored" : "here",
    //"This was before last element without comma" : "but is commented now"
}
```

## Modules Configurations Details

- [Chain configuration](./config-chains.md)
- [Attester client configuration](./config-attester-client.md)
- [Indexer configuration](./config-indexer.md)
- [Backend configuration](config-alerts.md/)
- [Alerts configuration](./config-backend.md)
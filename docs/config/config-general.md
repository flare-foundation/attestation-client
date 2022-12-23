# Configuration

All *Attestation Suite* modules configuration is done via JSON configuration files.

Configuration files are separated in two ways:

- Configuration
- Credentials

Configuration files are deployed with a deployment script whereas credential files are copied from the server.

In this way your credentials are never reveled and resign only on a server.

To separate configuration files by function the configuration files are named `something-config.json` and the credential files are named `something-credential.json`.

## Location

All configuration (configuration and credentials) files are located in `<installation folder>/configs/prod` for production and `<installation folder>/configs/dev` for development.

Deployment credential files are located in `<installation folder>/../.config/`.

> **IMPORTANT:**
> On deployment, the credential files from deployment overwrite all existing `<installation folder>/configs/prod` files.

> **IMPORTANT:**
> Deployment credential files MUST exist before deployment.

## Special JSON files

For ease of use we added to the JSON files the ability to use EOL and multi line comments and the ability to ignore ending commas.

Example:

``` json
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
- [Webserver configuration](config-alerts.md/)
- [Alerts configuration](./config-webserver.md)

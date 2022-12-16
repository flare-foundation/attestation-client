# Verifier Configuration

Verifier configuration is divided in two files:

- `<currency>-verifier-config.json`
- `<currency>-verifier-credentials.json`

## Configuration

`<currency>-verifier-config.json`

| Name                 | Description                                                                     | Default |
| -------------------- | ------------------------------------------------------------------------------- | ------- |
| `port`        | Server port of the verifier server                                                     |         |
| `checkAliveIntervalMs`       | Check interval in ms for web socket server (currently not supported)    |         |
| `sourceId` | Data source id of the source that the verifier supports (e.g. 'BTC', 'XRP', ...)          |         |
| `attestationTypes`   | String array of the names of the supported attestation types |                  |         |


## Credentials

`<currency>-verifier-credentials.json`


| Name                 | Description                                                                                                               | Default |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------- |
| `apiKeys`            | The list of objects `{name:string, apiKey: string, ip: string}` defining valid API keys                                   |         |
| `indexerDatabase`    | [Database Configuration](./json/json-DatabaseConfiguration.md) Indexer requires **read-write** access to indexer database |         |
| `chainConfiguration` | [Chain Configuration](./config-chains.md) Verifier requires  access to the client (node)                                  |         |

[Home](../README.md)/[Configuration general](./config-general.md)

# Indexer Configuration

Indexer configuration is divided in two files:

- `indexer-config.json`
- `indexer-credentials.json`

Additionally, the Indexer requires `chain-config.json` for chain configuration.

## Configuration

`indexer-config.json`

| Name                 | Description                                                       | Default |
| -------------------- | ----------------------------------------------------------------- | ------- |
| `syncEnabled`        | Enable chain back syncing                                         | true    |
| `syncTimeDays`       | How many days back to sync (decimals are supported)               | 2       |
| `blockCollectTimeMs` | How much time to wait before checking for new block               | 1000    |
| `syncUpdateTimeMs`   | How much time to wait before checking for new block while syncing | 10000   |

> **NOTE:**
> Entries with default values are optional.

## Credentials

`indexer-credentials.json`

| Name              | Description                                                                                                                | Default |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- | ------- |
| `indexerDatabase` | [Database Configuration](./json/json-DatabaseConfiguration.md). Indexer requires **read-write** access to indexer database |         |

[Home](../README.md)/[Configuration general](./config-general.md)

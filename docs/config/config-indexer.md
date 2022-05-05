[TOC](../README.md)/[Configuration general](./config-general.md)

# Indexer Configuration

Indexer configuration is divided in two files:
- `indexer-config.json`
- `indexer-credentials.json`

Additionally the Indexer requires `chain-config.json` for chain configuration.

## Configuration
`indexer-config.json`


|Name |Description |Default|
|---|---|---|
|syncEnabled|enabled sync|true|
|syncTimeDays|how many days back to sync (decimals are supported)|2|
|blockCollectTimeMs|how much time to wait between block collection|1000|
|syncUpdateTimeMs|while syncing every how many milliseconds to get new top block number|10000|

> Values with default value are optional.


## Credentials
`indexer-credentials.json`
|Name |Description |Default|
|---|---|---|
|indexerDatabase|[Database Configuration](./json/json-DatabaseConfiguration.md) Indexer requires **read-write** access to indexer database||


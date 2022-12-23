# Alerts Configuration

Alerts module configuration is in file:

- `alerts-config.json`

Depending on configuration, Alerts will require Attester Client configuration.

## Configuration

| Name                | Description                                                                                | Default                                   |
| ------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `interval`          | Alert update interval                                                                      | 5000                                      |
| `timeLate`          | Time in seconds when system status becomes late                                            | 5                                         |
| `timeDown`          | Time in seconds when system status becomes down                                            | 10                                        |
| `timeRestart`       | Time in seconds when system is restarted                                                   | 120                                       |
| `stateSaveFilename` | Path where alert status is saved                                                           | "../attester-status.json"                 |
| `indexers`          | **ARRAY** indexer alert systems. Supported systems are "ALGO", "BTC", "DOGE", "LTC", "XRP" |                                           |
| `indexerRestart`    | Indexer restart command                                                                    | `systemctl --user restart indexer-<name>` |
| `attesters`         | **ARRAY** [Attester Client Alert Config](#attester-client-alert-configuration)             |                                           |
| `backends`          | **ARRAY** [Backend Config](#backed-alert-configuration)                                    |                                           |

> **NOTE:**
> Entries with default values are optional.

## Attester Client Alert Configuration

| Name      | Description                                     | Default |
| --------- | ----------------------------------------------- | ------- |
| `name`    | Display name                                    |         |
| `path`    | Path to Attester Client configuration files     |         |
| `restart` | Command line to restart Attester Client service |         |

## Backed Alert Configuration

| Name      | Description                             | Default |
| --------- | --------------------------------------- | ------- |
| `name`    | Display name                            |         |
| `address` | Webserver URL address to check            |         |
| `restart` | Command line to restart Webserver service |         |

[Home](../README.md)/[Configuration general](./config-general.md)

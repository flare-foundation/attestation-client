# Attester Client Configuration

Attester client configuration is divided in two files:

- `attester-config.json`
- `attester-credentials.json`

Additionally, the Attester Client requires `chain-config.json` for chain configuration.

## Configuration

`attester-config.json`

| Name                                    | Description                                                                                   | Default          |
| --------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------- |
| `firstEpochStartTime`                   | Epoch start time in UNIX time                                                                 | 1636070400       |
| `roundDurationSec`                      | Epoch duration in seconds                                                                     | 90               |
| `globalConfigurationsFolder`            | Global configurations folder                                                                  | "./configs/global-configurations/" |
| `commitTimeSec                          | Commit time in seconds, actual commit time is: epoch start + epoch duration * 2 - commit time | 11               |
| `revealTime`                            | Reveal time in seconds, actual reveal time is: epoch start + epoch duration * 2 + reveal time | 80               |
| `submitCommitFinalize`                  | Additional empty submit at the beggining of a commit round to prompt round-2 finalize (should only be done on official AC, it burns additional funds) | false            |

> **NOTE:**
> Entries with default values are optional.

## Credentials

`attester-credentials.json`

| Name               | Description                                                                                                                         | Default |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `web`              | [Network Configuration](./json/json-NetworkConfiguration.md). Attester Client network credentials                                   |         |
| `attesterDatabase` | [Database Configuration](./json/json-DatabaseConfiguration.md). Attester Client requires **read-write** access to attester database |         |
| `indexerDatabase`  | [Database Configuration](./json/json-DatabaseConfiguration.md). Attester Client requires **read-only** access to indexer database   |         |

[Home](../README.md)/[Configuration general](./config-general.md)

# Chains configuration

Chains configuration file contains all external chain configuration.

- `chain-config.json`

| Name                          | Description                                                             | Default |
| ----------------------------- | ----------------------------------------------------------------------- | ------- |
| `name`                        | Chain name (XRP, BTC, DOGE)                                             |         |
| `mccCreate`                   | [MCC Create Configuration](./json/json-MCCCreateConfiguration.md)       |         |
| `rateLimitOptions`            | [Rate Limiting Options](./json/json-RateLimitingOptions.md)             |         |
| `numberOfConfirmations`       | Number of required block confirmations before block is considered final | 1       |
| `syncReadAhead`               | How many blocks are synced in parallel                                  | 20      |
| `blockCollecting`             | Block collection mode (`raw`, `rawUnforkable`, `tips`).                 | "raw"   |
| `minimalStorageHistoryDays`   |                                                                         | 2       |
| `minimalStorageHistoryBlocks` |                                                                         | 100     |
| `syncTimeDays`                | Per chain sync time override. Used if not 0.                            | 0       |
| `validateBlockBeforeProcess`  | Validate block before processing it (used for XRP).                     | false   |
| `validateBlockWaitMs`         | Wait time in ms before re-validating block.                             | 500     |
| `validateBlockMaxRetry`       | Number of retries for block to become valid before app restart.         | 10      |

> **NOTE:**
> Entries with default values are optional.

[Home](../README.md)/[Configuration general](./config-general.md)

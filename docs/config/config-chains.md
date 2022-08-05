# Chains configuration

Chains configuration file contains all external chain configuration.

- `chain-config.json`

| Name                          | Description                                                             | Default |
| ----------------------------- | ----------------------------------------------------------------------- | ------- |
| `name`                        | Chain name (XRP, BTC, LTC, ALGO, DOGE)                                  |         |
| `mccCreate`                   | [MCC Create Configuration](./json/json-MCCCreateConfiguration.md)       |         |
| `rateLimitOptions`            | [Rate Limiting Options](./json/json-RateLimitingOptions.md)             |         |
| `numberOfConfirmations`       | Number of required block confirmations before block is considered final | 1       |
| `syncReadAhead`               | How many blocks are synced in parallel                                  | 20      |
| `syncAverageBlocksPerDayStartRation`| What start block to use (in %) when calculating average blocks per day.| 0.9      |
| `blockCollecting`             | Block collection mode (`raw`, `rawUnforkable`, `tips`).                 | "raw"   |
| `minimalStorageHistoryDays`   |                                                                         | 2       |
| `minimalStorageHistoryBlocks` |                                                                         | 100     |
| `maxRequestsPerSecond`        |                                                                         | 80      |
| `maxProcessingTransactions`   |                                                                         | 3000    |
| `maxFailedRetry`              |                                                                         | 1       |
| `delayBeforeRetry`            |                                                                         | 10      |
| `maxValidIndexerDelaySec`     |                                                                         | 10      |
| `reverificationTimeOffset`    |                                                                         | 10      |
| `syncTimeDays`                | Per chain sync time override. Used if not 0.                            | 0       |
| `validateBlockBeforeProcess`  | Validate block before processing it (used for XRP) [ATC-2].             | false   |
| `validateBlockWaitMs`         | Wait time in ms before re-validating block.                             | 500     |
| `recheckBlockBeforeSave`      | Recheck transactions before saving them (used for UTXO chains) [ATC-5]  | false   |

> **NOTE:**
> Entries with default values are optional.

[Home](../README.md)/[Configuration general](./config-general.md)

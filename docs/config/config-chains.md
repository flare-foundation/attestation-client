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
| `blockCollecting`             | Block collection mode (`raw`, `rawUnforkable`, `tips`).                 | "raw"   |
| `minimalStorageHistoryDays`   |                                                                         | 2       |
| `minimalStorageHistoryBlocks` |                                                                         | 100     |
| `maxRequestsPerSecond`        |                                                                         | 80      |
| `maxProcessingTransactions`   |                                                                         | 3000    |
| `maxFailedRetry`              |                                                                         | 1       |
| `delayBeforeRetry`            |                                                                         | 10      |
| `maxValidIndexerDelaySec`     |                                                                         | 10      |
| `reverificationTimeOffset`    |                                                                         | 10      |

> **NOTE:**
> Entries with default values are optional.

[Home](../README.md)/[Configuration general](./config-general.md)

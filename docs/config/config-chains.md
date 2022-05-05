[TOC](../README.md)/[Configuration general](./config-general.md)
# Chains configuration

Chains configuration file contains all external chain configuration.


`chain-config.json`


|Name |Description |Default|
|---|---|---|
|name|chain name: XRP, BTC, LTC, ALGO, DOGE||
|mccCreate|[MCC Create Configuration](./)||
|rateLimitOptions|[Rate Limiting Options](./)||
|numberOfConfirmations||1|
|syncReadAhead||20|
|blockCollecting||"raw"|
|minimalStorageHistoryDays||2|
|minimalStorageHistoryBlocks||100|
|maxRequestsPerSecond||80|
|maxProcessingTransactions||3000|
|maxFailedRetry||1|
|delayBeforeRetry||10|
|maxValidIndexerDelaySec||10|
|reverificationTimeOffset||10|

> Values with default value are optional.
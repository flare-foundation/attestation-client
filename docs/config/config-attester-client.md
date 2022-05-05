[TOC](../README.md)/[Configuration general](./config-general.md)

# Attester Client Configuration

Attester client configuration is divided in two files:
- `attester-config.json`
- `attester-credentials.json`

Additionally the Attester Client requires `chain-config.json` for chain configuration.

## Configuration
`attester-config.json`


|Name |Description |Default|
|---|---|---|
|firstEpochStartTime|epoch start time in unix time|1636070400|
|roundDurationSec|epoch duration in seconds|90|
|dynamicAttestationConfigurationFolder|DAC - Dynamic Attestation Configuration folder|"./configs/dac/"|
|commitTime|commit time in seconds, actual commit time is: epoch start + epoch duration * 2 - commit time|11|
|revealTime|reveal time in seconds, actual reveal time is: epoch start + epoch duration * 2 + reveal time|80|

> Values with default value are optional.

## Credentials
`attester-credentials.json`
|Name |Description |Default|
|---|---|---|
|web|[Network Configuration](./json/json-NetworkConfiguration.md)||
|attesterDatabase|[Database Configuration](./json/json-DatabaseConfiguration.md) Attester Client requires **read-write** access to attester database||
|indexerDatabase|[Database Configuration](./json/json-DatabaseConfiguration.md) Attester Client requires **read-only** access to indexer database||


[TOC](../README.md)/[Configuration general](./config-general.md)

# Alerts Configuration

Alerts module configuration is in file:
- `alerts-config.json`

Depending on configuration Alerts will require Attester Client configuration.

## Configuration
`alerts-config.json`


|Name |Description |Default|
|---|---|---|
|interval|alert update interval|5000|
|timeLate|time in seconds when system status becomes late|5|
|timeDown|time in seconds when system status becomes down|10|
|timeRestart|time in seconds when system is restarted|120|
|stateSaveFilename|path where alert status is saved|"../attester-status.json"|
|indexers|**ARRAY** indexer alert systems<br>supported are "ALGO", "BTC", "DOGE", "LTC", "XRP"||
|indexerRestart|indexer restart command|"systemctl --user restart indexer-<name>"|
|attesters|**ARRAY** [Attester Client Alert Config](#attester-client-alert-configuration)||
|backends|**ARRAY** [Backend Config](#backed-alert-configuration)||

> Values with default value are optional.

---
## Attester Client Alert Configuration

|Name |Description |Default|
|---|---|---|
|name|display name||
|path|path to Attester Client configuration files||
|restart|command line to restart Attester Client service||

***
## Backed Alert Configuration

|Name |Description |Default|
|---|---|---|
|name|display name||
|address|backend URL address to check||
|restart|command line to restart backend service||





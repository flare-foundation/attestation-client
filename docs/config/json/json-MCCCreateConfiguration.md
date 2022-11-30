# MCC Create Configuration

MCC Create Configuration depends on the selected chain.

## XRP chain MCC Create Configuration

> Class `XrpMccCreate`

| Name        | Description      | Default |
| ----------- | ---------------- | ------- |
| `url`       | XRP RPC address  |         |
| `username`  | Network username | ""      |
| `password`  | Network password | ""      |
| `inRegTest` |                  | false   |

## ALGO chain MCC Create Configuration

> Class `AlgoMccCreate`

| Name      | Description                 | Default |
| --------- | --------------------------- | ------- |
| `algod`   | [AlgoNodeApp](#AlgoNodeApp) |         |
| `indexer` | [AlgoNodeApp](#AlgoNodeApp) |         |

### AlgoNodeApp

> Class `AlgoNodeApp`

| Name    | Description      | Default |
| ------- | ---------------- | ------- |
| `url`   | Algo RPC address |         |
| `token` | Algo token       | ""      |

## UTXO chain MCC Create Configuration

> Class `UtxoMccCreate`

| Name        | Description      | Default |
| ----------- | ---------------- | ------- |
| `url`       | XRP RPC address  |         |
| `username`  | Network username | ""      |
| `password`  | Network password | ""      |
| `inRegTest` |                  | false   |

> **NOTE:**
> Entries with default values are optional.

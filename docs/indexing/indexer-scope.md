# Scope of indexing

The most important feature of indexers is that they index blocks and transactions by certain properties allowing for fast queries on those properties.
For that purpose, the indexer consists of essentially two tables, one for blocks and one for transactions.
The entries into the tables are parsed from API responses for blocks and transactions, respectively.

## Blocks

The following properties are stored into the database for blocks:

| Property       | Description                                   |
| -------------- | --------------------------------------------- |
| `blockHash`    | (indexed) Hash of the block                   |
| `blockNumber`  | (indexed) Block number of a block             |
| `timestamp`    | (indexed) Block timestamp                     |
| `confirmed`    | (indexed) Whether a block is confirmed or not |
| `transactions` | Number of transactions                        |

The blocks table contains all observed blocks in the indexing window.

## Transactions

For transactions, we store:

| Property           | Description                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `transactionId`    | (indexed) ID of the transaction                                                                                |
| `blockNumber`      | (indexed) Confirmed block number in which transaction is present                                               |
| `timestamp`        | (indexed) Timestamp in seconds of a block of the transaction                                                   |
| `paymentReference` | (indexed) Payment reference of the transaction if it is a payment                                              |
| `isNativePayment`  | (indexed) Whether the transaction is a payment in system currency, e.g. contract calls are not native payments |
| `transactionType`  | (indexed) Type of transaction (specific for each blockchain)                                                   |
| `response`         | serialized response from API (JSON).                                                                           |

The transactions table contains confirmed transactions only. Transactions from the same confirmed block are stored to the indexer database in an atomic manner. Note that block-related data like `blockNumber` and `timestamp` may differ if read from the `response` field, since in some chains transactions are indexed in advance, where they are not yet in the correct block.

Next: [Indexer optimizations](./indexer-optimizations.md)

[Back to Home](../README.md)

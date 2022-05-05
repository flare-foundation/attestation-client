[TOC](../README.md)
# Scope of indexing

The most important feature of indexers is that they index blocks and transactions by certain properties allowing for fast queries on those properties.
For that purpose, the indexer consists of essentially two tables, one for blocks and one for transaction.
The entries into the tables are parsed from API responses for blocks and transactions, respectively. 

## Blocks

The following properties are stored into the database for blocks:
- `blockHash` - (indexed) hash of the block 
- `blockNumber` - (indexed) block number of a block 
- `timestamp` - (indexed) block timestamp
- `confirmed` - (indexed) whether a block is confirmed or not
- `transactions` - number of transactions

The blocks table contains all observed blocks in the indexing window.
## Transactions 

For transactions, we store:
- `transactionId` - (indexed) id of the transaction  
- `blockNumber` - (indexed)  confirmed block number in which transaction is present
- `timestamp` - (indexed) timestamp in seconds of a block of the transaction 
- `paymentReference` - (indexed) payment reference of the transaction if it is a payment 
- `isNativePayment` - (indexed) whether the transaction is a payment in system currency, e.g. contract calls are not native payments
- `transactionType` - (indexed) type of transaction (specific for each blockchain)
- `response` - serialized response from API (JSON). 

The transactions table contains confirmed transactions only. Transactions from the same confirmed block are stored to the indexer database in atomic manner. Note that block related data like `blockNumber` and `timestamp` may differ if read from the `response` field, since in some chains transactions are indexed in advance, where they are not yet in a correct block.

Next: [Synchronized query window](./synchronized-query-window.md)

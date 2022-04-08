# Scope of indexing

The most important feature of indexers is that they index blocks and transactions by certain properties allowing us for fast queries on those properties.
For that purpose, the indexer consists of essentially two tables, one for blocks and one for transaction.
The entries into the tables are parsed from API responses for blocks and transactions, respectively. 

For blocks, the following properties are stored into the database:
- `blockHash` - (indexed) hash of the block 
- `blockNumber` - (indexed) block number of a block 
- `timestamp` - (indexed) block timestamp
- `confirmed` - (indexed) whether a block is confirmed or not
- `transactions` - number of transactions

For transactions, we store 
- `transactionId` - (indexed) id of the transaction  
- `blockNumber` - (indexed)  block number in which transaction is present
- `blockTransactionIndex` - index of transaction in the block (???)
- `timestamp` - (indexed) timestamp in seconds of a block of the transaction 
- `paymentReference` - (indexed) payment reference of the transaction if it is a payment 
- `isNativePayment` - (indexed) whether the transaction is a payment in system currency, e.g. contract calls are not native payments
- `transactionType` - (indexed) type of transaction (specific for each blockchain)
- `response` - serialized response from API


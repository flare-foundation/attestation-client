# Blockchain indexer

The main data structure of blockchains typically consists of a sequence of blocks, where each block contains transactions in a specific order.
Each block is identified by a block hash and has a specific block number (height). Each transaction is identified by a transaction id (hash). Blockchain nodes have APIs that allow reading blocks and transactions. An indexer is used to collect the data about the blocks and transactions for a certain period and enable users to make certain types of queries fast. In our use case of attestation providers, indexers are used to read transactions within a certain **indexing time window**  from present back to some past time, for example for the last two days (duration `IndexingWindowSec`).

## Ensuring the same query time window

The main purpose of the indexer is to ensure that attestation providers will have the same view on the data that are being queried. 
In particular this means that for each particular query the attestation providers make for a specific attestation request in a given attestation round `roundId`, they will all agree on a query range defined by `lowest_timestamp` and `highest_block`. These values are prescribed in the attestation protocol and all attestation providers will either ensure that queries were carried out subject to these limitations, or they will abstain from sending attestations.

### Lower query window boundary 

For each attestation round `roundId` a timestamp of the start of its `collect` phase is a well known value that can be calculated from the parameters on `StateConnector` contract, specifically `BUFFER_TIMESTAMP_OFFSET`  and `BUFFER_WINDOW`, as 
```
startTime(roundId) = BUFFER_TIMESTAMP_OFFSET + roundId * BUFFER_WINDOW,
```
where all the units are seconds. Given a query window duration `queryWindowInSec`, we get:
```
startQueryTime(roundId) = startTime(roundId) - queryWindowInSec
```
Each block in any blockchain has a unique timestamp. Note that block timestamps may differ a lot from the real time of the block production. For example, in a slow block production blockchain like Bitcoin, timestamp may differ from the real time even for up to 2 hours. In addition, timestamps for blocks are not necessarily monotonically non-decreasing, like it is the case with Bitcoin. Specifically with Bitcoin, we can take instead of the block timestamp the value of `mediantime`, which is the median time of the last 11 blocks and it is monotonically non-decreasing. The current choice for the indexer system is that the `medinatime` is used as the timestamp in the indexer for the blockchains that base on the Bitcoin code.
Hence lower bound for queries is well defined in terms of a timestamp - all transactions in blocks with indexed timestamp greater then or equal to the calculated start time (based on `roundId` start time) are considered in queries. The role of indexer is just to ensure enough of history so that `indexingWindowSec > queryWindowInSec + MG`, where `MG` is some large enough margin.

### Upper query window boundary 

Syncing the query time window on the upper bound requires a bit more sophisticated approach. The practical requirement would be to use all available data up to the present. Even if we decided to use a cut-off time `CT`, we would not be completely sure whether an indexer had indexed all the blocks with timestamps lower or equal to  `CT`. Namely, there might be a block that we did not receive yet with timestamp matching the query. Even if we decided to put the timestamp "early enough" we still get the issue of what is "early enough".

On the upper boundary we also have another issue. Namely we should consider only confirmed transactions. What is a confirmed transaction depends on the block height as perceived by a particular indexer, which depends on a particular network node from which the indexer is reading data through API calls. It could happen that the indexers of different attestation providers have in the database different confimed block heights simply because some indexers are a little bit behind in indexing and writing to the database. But even if indexers were extremely fast in detecting confirmations and storing confirmed transactions into the database, there may still be issue with new confirmation blocks. Namely, it could happen that a confirmation block is very fresh and it is just being distributed throughout the network during a query time. Hence some data providers may sense this confirmation block while others may not, at their respective times of making verification queries. This will return different results and attestations. These cases show us that deciding what is the current confirmed block height in some blockchains is in essence not a clear-cut decision, such that 100% of indexers would agree on at their respective times of making their queries, hence decisions.

This situation gets aggravated in case when there are several (like 1000s) attestation requests in a single round and there are only a few such that are not clear-cut decisions. In general, each non-clear-cut confirmable request would cause that only like 50% of nodes on average would confirm the request. Assuming randomness of times when attestation providers sense a block with the next block number, only two such requests would cause that less then 50% of Merkle root attestation hashes would match. So the voting round would fail. Furthermore, if such a non-clear-cut decidable requests could be easily produced, one could use them to render attestation protocol non-operational by kind of a DOS attack, as the quorum could not be reached for several attestation rounds. Hence it is of high importance to make the probability of producing such non-clear-cut decidable attestation requests so small, that it does not have averse effects on the attestation protocol.

The approach to address this requires both sides - the indexer and queries - to be properly adapted. Consequently, all attestation types should be designed in such a way, that they are clear-cut decidable.

The timings proposed below all assume 90s voting round windows are used.
On the indexer side we can take care of the following things:
- the indexer should be checking the blockchain node for new confirmation blocks aggressively, like every second. 
- the indexer should store the transactions from the confirmed blocks as fast as possible and in the single atomic database transaction.

On the querying side we take the following approach. A _confirmation block_ is a block that confirms certain past block. For example, if `numberOfConfirmations` for Bitcoin is 6, this means there must exist 5 more blocks and a block on height `blockNumber + 5` (in general `blockNumber + numberOfConfirmation - 1`) is called a _confirmation block_ for height `blockNumber`.
When querying, the mandatory input into the query is the hash of the confirmation block for the query window upper boundary block. We indicate the hash as the `upperBoundProof`. Given the `upperBoundProof`, a block with this hash is first determined from the block table in the database. Let `H` be the height of this block, then the upper query boundary is defined by `H - numberOfConfirmations + 1`. Surely, blocks of such height are confirmed.

Following the discussion above, it two things, that prevent us in getting the synchronized upper window query boundary can happen while querying indexer:
- a block with the hash `upperBoundProof` does not exist in the database,
- a block with the hash `upperBoundProof` exists in the database, but database does not contain all the confirmed blocks, in particular the ones at the height `H - numberOfConfirmations + 1`.

The latter case clearly implies that our indexer is too slow and we need to wait a bit more before making a query. If it takes too long, we must abstain from voting in the current voting round.
On the other hand, the former case may be further divided into two cases:
- a block with the hash `upperBoundProof` has not yet arrived to our blockchain node, so the indexer has not read it yet. We should wait a bit more.
- there is no block with the hash `upperBoundProof`. We should reject the attestation that triggered the query.

The main idea for reaching a synchronized upper boundary is the following. If an attestation request is valid (can be confirmed), then the confirmation block with the hash `upperBoundProof` must exist, such a block has been mined and the proposer must have seen it. Except in the case of "selfish mining" as described below, such a block is either being distributed or has been already distributed throughout the blockchain peer nodes. Hence an attestation provider should just wait for say 30s from the end of the `collect` phase in which the associated request was sent, and it should receive it with very high probability. So the correct behavior that always works with high probability is: if you already have the block with the hash `upperBoundProof`, you are safe to make a query and proceed with other checks for confirming/rejecting the attestation request. On the other hand, if you do not have such a block, wait 30s and then retry. In case the provided `upperBoundProof` is wrong, nobody will find a block with such a hash in the database, hence everybody will reject the attestation request due to a wrong `upperBoundProof`.

There is a case of a so called "selfish mining", where a miner keeps block for himself to mine the next block and then sends it to others later, gaining some edge over others, but also possibly risking of loosing the advantage, since miners may start mining on other blocks of the same height. In this case, one could use the delayed blocks to attack the attestation system by carefully timed sending, thus introducing non-clear-cut decision requests. But such a scenario is highly improbable and hard to produce, even for a single case, but basically impossible to repeat consistently, unless on a blockchain is undergoing 50%+ attack.

The proper query procedure can be thus summarized in terms of a 2-step procedure.

### The first step (initial query)

- Read the block with the hash `upperBoundProof` from the database.
- If such a block does not exist, delay the query to the second step (finish this step).
- Otherwise, let `H` be the block number (height) for the block with the hash `upperBoundProof`. Let `U = H - numberOfConfirmations + 1`.
- Read the last confirmed block number `N` in the indexer.
- If `N >= U`, then proceed with the query and the upper boundary `U`.
- Otherwise `U` should have been the confirmed height, but since `N < U`, the indexer is lagging. Delay the query to the second step.

### The second step (delayed query)

- the query in this step is made after the half of the `commit` phase of the attestation round in which a request is processed. This should be at least 45s after the end of the `collect` phase, when the last attestation request was submitted for this round. The time of 45s should be enough time for other indexers to receive blocks that existed up to the end of the `collect` phase of the current attestation round. 
- Read the block with the hash `upperBoundProof` from the database.
- If such a block does not exist, we first verify, if our aggressive reading of blocks works well. Indexer is trying to read new top blocks aggressively, and every time it makes a check, it stores a timestamp into the database. 
  - If the "last read" timestamp is too old (like more than 10s), then something is wrong with our indexer. We should completely abstain from voting in this round.  
  - Otherwise, everything is ok with the indexer and we can be sure with very high probability, that a block with the hash `upperBoundProof` does not exist, the attestation request is invalid.
- Otherwise, such a block exists. let `H` be the block number (height) for the block with the hash `upperBoundProof`. Let `U = H - numberOfConfirmations + 1`.
- Read the last confirmed block number `N` in the indexer.
- If `N >= U`, then proceed with the query and the upper boundary `U`.
- Otherwise `U` should have been confirmed height, but since `N < U`, the indexer is lagging. Since we do not have anymore time to delay, we clearly have problems with our indexer and we should completely abstain from voting in this round.
## Scope of indexing

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

## Indexer optimizations

Indexers collect lots of data and as the time goes by, tables can become bigger and queries slower. Slower queries could have impact on the attestation system, as flooding the system with nonsense requests to such an extent, that 90 seconds would not be enough to check all of them, is itself a form of a DOS attack on the system. In addition, syncing indexers also takes some time, and if attestation provider wants to start or is in recovering, the syncing procedure should not last too long. These are the main reasons for choosing limited indexing time windows.

### Double transaction tables

A part of maintaining limited history storage is also efficiently deleting the old data, that fall out of the indexing time window.
The table of blocks is very light and essentially does not need cleaning up of old blocks. On the other hand, the transactions table can become quite packed, as there are way more transactions then blocks in blockchains and transaction entries are more heavy, containing more indexed fields and potentially much more heavier `response` field. Deleting old transactions periodically could be tricky and could put some load on the database. Instead of that we chose to use to tables, where each table fills transaction until the indexing time window time has passed. Then we switch to the other table. If the other table is non empty, we just drop it prior to switching. The drop is practically an instant operation. In this way we always cleanup the indexes and row counters get reset. The cost is, that we have to make queries into two tables each time.



### API request rate limiting and caching

In our implementation in Node.js we use our _Multi Chain Client_ library `flare-mcc`. In contains `axios` client to communicate with blockchain APIs. We have upgraded the client to support rate limiting and request caching. Rate limiting is important to ensure stability of communication with API nodes, in order to not get rate limited or cause problems on the nodes. Typically requests from indexers include just the following calls to the blockchain API:
- get transactions by transaction id,
- get block by block number or hash,
- get block height.

Caching of API responses is important mainly for transactions. An important use case is in case of Bitcoin and other Bitcoin code based UTXO blockchains. Namely, in UTXO blockchains a source address is obtained by querying the blockchain API for each transaction on each input. There can be up to 20 inputs and possibly many different UTXO outputs from different transactions. Usually we can get a block info and info of all transactions in the block in one request. But then we have to make for each of those transactions many requests for input transactions. Those could repeat and caching responses helps here a bit. Note that some blocks can have even over 2000 transactions and some experimental calculations showed that we would do for each transaction even than 4 additional API calls on average for input transactions. With Bitcoin blocks of over 2000 transactions this may take even 5 minutes. Compared to 10 minute average block production of Bitcoin the indexing would take quite some time. Also, the most critical requirement for an indexer is that confirmed transactions are stored into the database immediately after the confirmation block arrives. Hence we have to process transactions from unconfirmed blocks in advance. Since unconfirmed blocks may be in different forks, we might be processing wrong fork. But what we know is that even we are in the wrong fork, transactions in that wrong block will be similar. So here caching can also help a lot. Also noted, that we used another optimization, namely we read all inputs of all transactions that have payment reference defined only. For others, it depends on attestation type, whether we do additional reads during verification phase or not.


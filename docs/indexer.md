# Blockchain indexer

The main data structure of blockchains typically consists of a sequence of blocks, where each block contains transactions in a specific order.
Each block is identified by a block hash and has a specific block number (height). Each transaction is identified by a transaction id (hash). Blockchain nodes have APIs that allow reading blocks and transactions. An indexer is used to collect the data about the blocks and transactions for a certain period and enable users to make certain types of queries fast. In our use case of attestation providers, indexers are used to read transactions within a certain **indexing time window**  from present back to some past time, for example for the last two days (duration `IndexingWindowSec`).

The main purpose of the indexer is to ensure that attestation providers will have the same view on the data that is being queried. 
In particular this means, that for each particular query the attestation providers make for a specific attestation request in a given attestation round `roundId`, they will all agree on a query range defined by `lowest_timestamp` and `highest_block`. These values are prescribed in the attestation protocol and all attestation providers will either ensure that queries were carried out subject to these limitations, or they will abstain from sending attestations.

## Ensuring the same query time window

For each attestation round `roundId` a timestamp of the start of its `collect` phase is a well known value that can be calculated from the parameters on `StateConnector` contract, specifically `BUFFER_TIMESTAMP_OFFSET`  and `BUFFER_WINDOW`, as 
```
startTime(roundId) = BUFFER_TIMESTAMP_OFFSET + roundId * BUFFER_WINDOW,
```
where all the units are seconds. Given a query window duration `queryWindowInSec`, we get:
```
startQueryTime(roundId) = startTime(roundId) - queryWindowInSec
```
Each block in any blockchain has a unique timestamp. Note that block timestamps may differ a lot from the real time of the block production. For example, in a slow block production blockchain like Bitcoin, timestamp may differ from the real time even for up to 2 hours. In addition, timestamps for blocks are not necessarily monotonically non-decreasing, like it is the case with Bitcoin. Specifically with Bitcoin, we can take instead of block timestamp the value of `mediantime`, which is the median time of the last 11 blocks and it is monotonically non-decreasing. The current choice for the indexer system is that the `medinatime` is used as the timestamp in the indexer for the blockchains that base on the Bitcoin code.
Hence lower bound for queries is well defined in terms of a timestamp - all transactions in blocks with indexed timestamp greater then or equal to the calculated start time (based on `roundId` start time) are considered in queries. The role of indexer is just to ensure enough of history so that `indexingWindowSec > queryWindowInSec + MG`, where `MG` is some large enough margin.

Syncing the query time window on the upper bound requires a bit more sophisticated approach. The practical requirement would be to use all available data up to the present. Even if we decided to use a cut-off time `CT`, we would not be completely sure whether an indexer had indexed all the blocks with timestamps lower or equal to  `CT`. Namely, there might be a block that we did not receive yet with timestamp matching the query. Even if we decided to put the timestamp "early enough" we still get the issue of what is "early enough".
On the upper boundary we also have another issue. Namely we should consider only confirmed transactions. What is a confirmed transaction depends on the block height as perceived by a particular indexer, which depends on a particular network node from which the indexer is reading data through API calls. It could happen that the indexers of differrent attestation providers have in the database different confimed block heights simply because some indexers are a little bit behind in indexing and writing to the database. But even if indexers were extremely fast in detecting confirmations and storing confirmed transactions into the database there may still be issue with new confirmation blocks. Namely, it could happen that a confirmation block is very fresh and it is just being distributed throughout the network during a query time. Hence some data providers may sense this confirmation block while others may not yet at their respective times of making verification queries. This will return different results and attestations. These cases show us that deciding what is the current confirmed block height in some blockchains is in essence not a clear-cut decision, such that 100% of indexers would aggree on at their respective times of making their queries, hence decisions.

This situation gets aggravated in case when there are several (like 1000s) attestation requests in a single round and there are only a few such that are not clear-cut decisions. In general, each non-clear-cut confirmable request would cause that only like 50% of nodes in average would confirm the request. Assuming randomness of times when attestation providers sense a block with the next block number, only two such requests would cause that less then 50% of merkle root attestation hashes would match. So the voting round would fail. Furthermore, if such a non-clear-cut decidable requests could be easily produced, one could use them to render attestation protocol non-operational by kind of a DOS attack, as the quorum could not be reached for several attestation rounds. Hence it is of high importance to make the probability of producing such non-clear-cut decidable attestation requests so small, that it does not have averse effects on the attestation protocol.

The approach to address this requires both sides - the indexer and queries - to be properly adapted. Consequently, all attestation types should be designed in such a way, that they are clear-cut decidable.

On the indexer side we can take care of the following things:
- the indexer should be checking the blockchain node for new confirmation blocks aggresively, like every second.
- the indexer should store the transactions from the confirmed blocks as fast as possible and in the single atomic database transaction.

On the querying side we take the following approach. Each request should provide:
- the last `blockNumber` that should be used in query,
- the proof of the existence of the confirmation block of this block, which we call the `dataAvailabilityProof`. 

Consider a blockchain for which the `numberOfConfirmations` is given. For example in Bitcoin, this is usually 6, which means that 5 more blocks above the block must exist. If we want to make a query in a query window ending with the `blockNumber`, we must provide the hash of a confirmation block `dataAvailabilityProof`. In case of Bitcoin this would be the hash of any block on height `blockNumber + numberOfConfirmations - 1`.

Then during querying, we follow the 2-step procedure, where the first step either already handles the query or decides that this is an edge case and postpone the query to the second step.

### The first step (initial query):
- read the last confirmed block number `N` in the indexer .
- If `blockNumber < N - 1`, then this is a block that all data providers and their indexers, including us, had enough time to process. Query the database and make the decision.
- Otherwise, read the timestamp of the latest check for new blocks of the indexer. 
- If the timestamp is older than 10s (for 90s voting rounds), then there must be something wrong with the indexer, so abstain from the attestation round.
- Read the last perceived block height by the indexer, say `T`. We know now that it is valid for at least the last 10s.
- Verify that the indexing of the confirmed transactions is not significantly late by checking that `N >= T - numberOfConfirmations` (at most one confirmation block is just being written into the database).
- If the above condition is not met, the indexing is being significantly delayed, and we delay the query to the second step.
- Otherwise we check whether `blockNumber > N + 1`.
- If this is the case, the request was sent too early and no confirmations are possible. We reject the attestation.
- Otherwise we know that `N - 1 <= blockNumber N + 1` and we are in the "edge-case". We delay the query to the second step.

### The second step (delayed query):
- this query is made after the half of the `commit` phase of the attestation round in which a request is processed. This should be at least 45s after the end of the `collect` phase when the last attestation request was submitted for this round. The time of 45s should be enough time for other indexers to receive blocks that existed up to the end of the `collect` phase of the current attestation round. 
- Read for the last confirmed block number in the indexer `N` (it has hopefully increased from the first step).
- `dataAvailabilityProof` is used as a synchronization mechanism in the second step. The existence of the block with the hash equal to `dataAvailabilityProof` is checked by querying the block table. 
- If the block with `dataAvailabilityProof` does not exist, reject the attestation. 
- If it does exist, first check if it is on the correct confirmation height. If it is not, then reject the attestation.
- Otherwise, check if `blockNumber <= N`, and if true, then make the query and verify or reject the attestation request and return the result.
- If `blockNumber == N + 1` and `N + numberOfConfirmations - 1 < T` then our indexing is a bit too slow, abort the round (one may delay an repeat the query again a bit latter, before the attestation submission time).
- Otherwise reject the attestation request.


Note that if the transaction is old enough, everything is decided in the first step and `dataAvailabilityProof` is not used. Also note that the above procedure requires that the attestation request submitter has seen the confirmation block with `dataAvailabilityProof` hash. If it just blindly sends the request with some arbitrary value of in place of `dataAvailabilityProof`, it will be clearly rejected by all attestation providers in the second step. If the block with hash equal to `dataAvailabilityProof` was mined, the sender of the request must have seen the hash and block proposal should have been submitted into the network and the proposal should be distributed within the last 45s. Hence the probability of any attestation provider not seeing this block is extremely low.

Though, there is a case of a so called "selfish mining", where a miner keeps block for himself to mine the next block and then sends it to others later, gaining some edge over others, but also possibly risking of loosing the advantage, since miners may start mining on other blocks of the same height. In this case one could use the delayed blocks to attack the attestation system by carefully timed sending, thus introducing non-clear-cut decision requests. But such a scenario is highly unprobable and hard to produce, even for a single case, but basically impossible to repeat consistently, unless on a blockchain undergoing 50%+ attack.

### Providing `blockNumber` and `dataAvailabilityProof` in the request.

Consider an approach, where upper query bound would be solely determined by providing `dataAvailabilityProof`. Then the query would be simpler: if you find the block with the hash equal `dataAvailabilityProof`, then you can calculate what is the relevant `blockNumber` and check, whether it is considered confirmed in the indexer. In case it is confirmed, one should perform the query. If not, one should delay it. Note that in this case `dataAvailabilityProof` is used with every query, not just in the second step as described before. We did not choose this approach due to following reason. Namely, such a block with the hash equal `dataAvailabilityProof` may be on dead fork way back in history, but technically would still be a valid confirmation block. We do not have control, whether blockchain nodes keep this stale fork from past history in memory, and if this is not the case, then such a behaviour could be used to destabilize the attestation protocol. On the other hand, we can be fully sure, that newest forks are available. Hence we decided for the redundancy of providing both `blockNumber` and `dataAvailabilityProof`, using the block number for majority of times, while using `dataAvailabilityProof` just in edge cases, which appear near the top of the chain.
## Scope of indexing

The most important feature of indexers is that they index blocks and transactions by certain properties allowing us for fast queries on those properties.
For that purpose, the indexer consists of essentianlly two tables, one for blocks and one for transaction.
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
- `transactionType` - (indexed) type of transaction (specidic for each blockchain)
- `response` - serialized response from API

## Indexer optimizations

Indexers collect lots of data and as the time goes tables can become bigger and queries slower. Slower queries could have impact on attestation system, as flooding the system with nonsense requests to such an extent, that 90s would not be enough to check all of them, is itself a form of a DOS attack on the system. In addition, syncing indexers also takes some time, and if attestation want to start or they are recovering, the syncing procedure should not last too long. These are the main reasons for choosing limited indexing time windows.

### Double transaction tables

A part of maintaining limited history storage is also efficiently deleting the old data, that fall out of the indexing time window.
The table of blocks is very light and essentially does not need cleaning up of old blocks. On the other hand, the transactions table can become quite packed, as there are way more transactions then blocks in blockchains and transaction entries are more heavy, containing more indexed fields and potentialy much more heavier `response` field. Deleting old transactions periodically could be tricky and could put some load on the database. Instead of that we chose to use to tables, where each table fills transaction until the indexing time window time has passed. Then we switch to the other table. If the other table is non empty, we just drop it prior to switching. The drop is practically an instant operation. In this way we always cleanup the indexes and row counters get reset. The cost is, that we have to make queries into two tables each time.

### API request rate limiting and caching

In our implementation in Node.js we use our _Multi Chain Client_ library `flare-mcc`. In contains `axios` client to communicate with blockchain APIs. We have upgraded the client to support rate limiting and request caching. Rate limiting is important to ensure stability of communication with API nodes, in order to not get rate limited or cause problems on the nodes. Typically requests from indexers include just the following calls to the blockchain API:
- get transactions by transaction id,
- get block by block number or hash,
- get block height.

Caching of API responses is important mainly for transactions. An important use case is in case of Bitcoin and other Bitcoin code based UTXO blockchains. Namely, in UTXO blockchains a source address is obtained by querying the blockchain API for each transaction on each input. There can be up to 20 inputs and possibly many different UTXO outputs from diffrent transactions. Usually we can get a block info and info of all transactions in the block in one request. But then we have to make for each of those transactions many requests for input transactions. Those could repeat and caching reponses helps here a bit. Note that some blocks can have even over 2000 transactions and some experimental calculations showed that we would do for each transaction even than 4 additianal API calls on average for input transactions. With Bitcoin blocks of over 2000 transactions this may take even 5 minutes. Compared to 10 minute average block production of Bitcoin the indexing would take quite some time. Also, the most critical requirement for an indexer is that confirmed transactions are stored into the database immediately after the confirmation block arrives. Hence we have to process transactions from unconfirmed blocks in advance. Since unconfirmed blocks may be in different forks, we might be processing wrong fork. But what we know is that even we are in the wrong fork, transactions in that wrong block will be similar. So here caching can also help a lot. Also noted, that we used another optimization, namely we read all inputs of all transactions that have payment reference defined only. For others, it depends on attestation type, whether we do additinal reads during verification phase or not.


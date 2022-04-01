# Blockchain indexer

The main data structure of blockchains typically consists of a sequence of blocks, where each block contains transactions in a specific order.
Each block is identified by a block hash and has a specific block number (height). Each transaction is identified by a transaction id (hash). Blockchain nodes have APIs that allow reading blocks and transactions. Indexer service is used to collect the data about the blocks and transactions for a certain period and enable users to make certain queries fast. In our use case of attestation providers, indexers are used to read transactions within a certain **indexing time window** (`IndexingWindowSec`) from present to some past time, for example for the last day. 

The main purpose of the indexer is to ensure that attestation providers will have the same view on the data that is being queried. 
In particular this means, that the queries that attestation providers will use will always include the ranges on transactions that are defined by `lowest_timestamp` and `highest_block`. These values are prescribed in the attestation protocol for every attestation request (hence all related queries) implying that all attestation providers will either ensure that all queries were carried out subject to these limitations or they will abstain from sending attestations.

## Ensuring the same query time window

For each attestation round `roundId` a timestamp of the start of its `collect` phase is a well known value that can be calculated from the parameters on `StateConnector` contract, specifically `BUFFER_TIMESTAMP_OFFSET`  and `BUFFER_WINDOW`, as 
```
startTime(roundId) = BUFFER_TIMESTAMP_OFFSET + roundId * BUFFER_WINDOW,
```
where all the units are seconds. Given a query window duration `queryWindowInSec`, we get:
```
startQueryTime(roundId) = startTime(roundId) - queryWindowInSec
```
Each block on any blockchain has a timestamp. Note that block timestamps may differ a lot from the real time of the block production. For example in a slow block production blockchain like Bitcoin timestamp may differ from the real time even for up to 2 hours. In addition, timestamps for blocks are not necessarily monotonically non-decreasing, like it is the case with Bitcoin. Specifically with Bitcoin, we can take instead of block timestamp the value of `mediantime`, which is the median time of the last 11 blocks and it is monotonic. The current choice for the system is that the `medinatime` is used as the timestamp in the indexer for the blockchains that base on the Bitcoin code.
Hence lower bound for queries is well defined in terms of a timestamp - all transactions in blocks with indexed timestamp greater or equal then the calculated (based on `roundId` start time) are considered in queries. The role of indexer is just to ensure enough of history so that `indexingWindowSec > queryWindowInSec + MG`, where `MG` is some large enough margin.

Syncing on the upper bound requires a bit more sophisticated approach. The practical requirement would be to use all available data up to present. Even if we decided to use cut-off time `CT`, we would not be completely sure whether an indexer had indexed all the blocks with timestamps lower or equal to  `CT`. Namely, there might be a block that we did not receive yet with timestamp matching the query. Even if we decided to put the timestamp "early enough" we still get the issue of what is "early enough".
On the upper boundary we also have another issue. Namely we should consider only confirmed transactions. What is a confirmed transaction depends on the block height as perceived by a particular indexer, which depends on a particular network node from which the indexer is reading data through API calls. It could happen that the indexers of differrent attestation providers have in the database different confimed block heights simply because some indexers are a little bit behind. But even if indexers were extremely fast in detecting confirmations and storing confirmed transactions into the database there may still be issue with new confirmation blocks. Namely, it could happen that the confirmation block is very fresh and is just being distributed throughout the network. Hence some data providers may sense this confirmation block while others may not yet at their respective times of making verification queries. This will return different results and attestations. These cases show us that deciding what is the current confirmed block height in some blockchain is in essence not a clear-cut decision, such that 100% of indexers would aggree on at their respective times of making their decisions.

This situation gets aggravated in case when there are several (like 1000s) attestation requests in a single round and there are only a few such that are not clear-cut decisions. In general each each non-clear-cut confirmable request would cause that only like 50% of nodes would confirm the request. Assuming randomness of times when attestation providers sense a block with the next block number, only two such requests would cause that less then 50% of attestation hashes would match. So the voting round would fail. Furthermore, if such non-clear-cut decidable requests could be easily produced, one could use them to render attestation protocol non-operational as the quorum could not be reached for several attestation rounds. Hence it is if high importance to make the probability of producing such non-clear-cut decidable attestation requests so small, that it does not have averse effects on the attestation protocol.

The approach to address this requires both sides - the indexer and queries - to be properly adapted. Consequently, all attestation types should be designed in such a way, that they are clear-cut decidable.

On the indexer side we can take care of the following things:
- the indexer should be checking the blockchain node for new confirmation blocks aggresively, like every second.
- the indexer should store the transactions from the confirmed blocks as fast as possible and in the single atomic database transaction.

On the querying side we take the following approach. Each request should provide:
- the last `blockNumber` that should be used in query,
- the proof of the existence of the confirmation block of this block, which we call the `dataAvailabilityProof`. 

Consider a blockchain for which the `numberOfConfirmations` is given. For example in Bitcoin, this is usually 6, which means that 5 more blocks above confirmed block must exist. If we want to attest for a transaction with the transaction id `txId`, we should provide in addition the `blockNumber` of the block in which the transaction is placed and the hash of a confirmation block `dataAvailabilityProof`. In case of Bitcoin this would be the hash of any block on height `blockNumber + numberOfConfirmations - 1`.

Then when querying we follow the 2-step procedure, where we first make a query to see if the request is possibly edge-case decidable.

First step (Initial query):
- check for the last confirmed block number in the indexer `N`.
- If `blockNumber < N - 1`, then this transaction is in the block which all data providers had enough time to process, including us. Query the database, check the transaction `response` fielda and make attestation decision.
- otherwise check the timestamp of the latest check for new blocks of the indexer. 
- If the timestamp is older than 10s (for 90s voting rounds) then there must be something wrong with indexer so abort from the voting round.
- Check the last perceived height by indexer, say `T`. We know now that it is valid for at least the last 10s.
- Verify that indexing of the confirmed transactions is not significantly late by checking that `N >= T - numberOfConfirmations` (at most one confirmation block is just being written into the database).
- If the indexing is late we delay query to the next step.
- Otherwise we check whether `blockNumber > N + 1`.
- If this is the case, the request was sent too early and no confirmations are possible. We reject the attestation.
- Otherwise we know that `N - 1 <= blockNumber N + 1` and we are in the "edge-case". We delay the query to the second step.

Second step (Delayed query):
- this query is made after the half of the `commit` phase of the attestation round in which a request is processed. This should be at least 45s after the end of the `collect` phase when the last attestation request was submitted. 45s should be enough time for other indexers to receive blocks that existed up to the end of the `collect` phase of the current attestation round. 
- check for the last confirmed block number in the indexer `N` (it has hopefully increased from the first step).
- `dataAvailabilityProof` is used as synchronization mechanism in the second step. Existence of the block with the hash equal to `dataAvailabilityProof` is checked in the block table. If this block does not exist, there is extremely low probability that we would not receive the block by this time. Namely, if such a block was mined, the sender of the request must have seen the correct hash and should have submitted block proposition to the network and the block should already be distributed within the last 45 seconds. There is a case of so called "Selfish mining", where a miner keeps block for himself to mine the next block and then sends it to others later, gaining some edge over others but also loosing it since miners may start mining on other blocks of the same height. In this case one could use the delayed blocks to attack the attestation system thus introducing non-clear-cut requests. But such a scenario is highly unprobably and hard to produce, for a single case, but basically impossible to do this consistently, unless some chain is undergoing 50%+ attack.
- if the block with `dataAvailabilityProof` exists, first check if it is on the correct confirmation height. If it does not, then reject attestation.
- if `blockNumber <= N`, make the query and verify or reject the request and return the result.
- if `blockNumber == N + 1` and `N + numberOfConfirmations - 1 < T` the our indexing is too slow, abort the round (one may delay an repeat the query again a bit latter, before the attestation submission time).
- otherwise reject the attestation request.


Note that the above procedure requires that the attestation request submitter has seen the confirmation block. If it just blindly sends the request in will be surely rejected by all attestation clients. Note that if the transaction is old enough, `dataAvailabilityProof` is not used and decision is already after the query in the first step.

The most important feature of indexers is that they index blocks and transactions by certain properties allowing us for fast queries.
For that purpose the indexer consists of essentianlly two tables, one for blocks and one for transaction.
The entries into tables are parsed from API responses for blocks and transactions, respectively. 

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

## Keeping indexer up to date


For an indexer to be *up-to-date* we require the following:
- the indexer contains all blocks and transactions from the current timestamp `now` (in seconds) back to `now - queryWindowInSec`, where `queryWindowInSec` defines the size of query window, and for one day, it would be 86400 seconds. 
- the indexer should be aggressive in obtaining the latest blocks. It should check relevant block API for new blocks frequently, for example every second.
- Indexer should store a block into the database immediately after ite becomes aware of it.
- Indexer should store transactions into the database only after they are confirmed. Confirmation of a block with blockNumber `N` is decided immediately after a block with height `N + numberOfConfirmations`.

# Blockchains




Indexer consists of:
- Indexer Service (read/write)
- Indexed Query Handler - used to make specific queries (read only)

## Indexer Service

Indexer service uses two types of database storage:
- `database` - persistant self-cleaning indexed SQL database containing only the confirmed transactions and all the read blocks. 
- `cache` - temporary key-value database, that is used to cache all the read transactions

Each external chain has a non-decreasing block timestamp. UTXO chains have median time. 

### Efficient indexing

All blocks but only confirmed transactions are stored into the database. Confirmed blocks are marked. It is required, that once a knowledge of a confirmed block is obtained, all transactions need to be stored into the database practically instantly. 

In UTXO (Bitcoin) chains reading transactions and their input transactions from a confirmed block can take 5 minutes or more. Hence indexer should read transactions in advance and cache them. Indexer will aggresivelly and periodically check (like every 1s) for main fork blocks after `N`. It will also have a pool of data availability hashes above height `N` which will be checked for existence in a similar aggressive manner.

Also, all transactions in known blocks (obtained from the main fork or as data availability proof) will be read and cached and only after one of the blocks on height above `N` will be confirmed, cached transactions will be used to prepare a package of the transactions in the `N + 1`-th confirmed block. All candidates for `N + 1`-th block will be indexed in a front-running manner. If all candidates for `N + 1`-th blocks are read and cached the algorithm may proceed with indexing transactions from known `N + 2`-th block candidates.

## Indexed Query Handler

Indexed Query Handler is a query service using the persistant database and possibly direct on-chain calls with queries specialized for attestation checks.

### Queries

The following types of queries are supported:
- (Q1) - block hash existence check
- (Q2) - transaction existence check
- (Q3) - referenced transaction existence

Each attestation request will provide 
- `roundId`
- `txId` or `paymentReference`
- `blockNumber` in which the confirmed transaction is present.
- `dataAvailability` - the hash of a block on a confirmation height (`L`)

The database of the indexer service contains only transactions in confirmed blocks. A block is confirmed if there exists a chain of blocks above it of length `L`, where `L` depends on a specific chain.

### Time boundaries 

Each blockchain has blocks enumerated by `blockNumber` and some kind of a timestamp. In Bitcoin we use `mediantime` for lower bound.

`QTI` - query time interval (14 days in seconds).
`ARS(roundId)` - the timestamp on Flare blockchain of the start of the attestation round `roundId` (Unix epoch)

Only blocks on external chains with timestamps greater or equal `TMIN(roundId) = ARS(roundId) - QTI` are taken in consideration


### Q1 - Block hash check

Inputs:
- `hash`

If the block with `hash` is stored in the database, it returns a stored block API response subject to timestamp being greater or equal to `TMIN(roundId)`. In case the block is not found in database, query to blockchain is carried out for UTXO chains and result is returned. The reponse contains `status` field, that can be `OK` or `NOT_EXIST`. In case of status `NOT_EXIST`, the `block` field is empty.

The response structure
```
{
   status: "OK" | "NOT_EXIST",
   block?: any
}
```

### Q2 - Transaction existence check

Inputs:
- `txId` - transaction id
- `blockNumber` - block number for the transactio with `txId`
- `dataAvailability` - hash of confirmation block (used for syncing of edge-cases)
- `roundId` - voting round id for check
- `type` - `FIRST_CHECK` or `RECHECK`

returns the stored transaction API response with transaction id `txId` if in the block with `blockNumber`, where the block's timestamp is greater or equal to `TMIN(roundId)`. The response contains transaction API response and status. The rules for search depend on the `type`, which can be (1) `FIRST_CHECK` or (2) `RECHECK` (see below)

Response `status` can be one of: `OK`, `RECHECK` and `NOT_EXIST`. Only in case of status `OK`, the stored transaction API response is non-empty.

The response structure looks like this:

```
{
   status: "OK" | "RECHECK" | "NOT_EXIST",
   transaction?: any
}
```

#### Q2 - `FIRST_CHECK`

At the moment of a query the indexer database has indexed transactions up to the block number `N`. These cases can happen:

- `blockNumber` is strictly lower than `N - 1`. Then all transactions in the block with the `blockNumber` exist in the indexer database. Query is carried out on the database and if `txId` exists in the confirmed block with `blockNumber`, the stored transaction API response is returned with status `OK`. If `txId` does not exist in this range, status `NOT_EXIST` is returned. Confirmation block `dataAvailability` hash is not used in this case.
- `blockNumber` equals `N - 1`, `N` or `N + 1`. These situations may happen: (1) `N - 1` - we might be faster then others, (2) `N` - we may be faster or slower then others, (3) `N + 1` - we might be slower then others. In all those cases empty transaction is returned with status `RECHECK`
- `blockNumber` is strictly greater than `N + 1`. Empty transaction with status `NOT_EXIST` is returned

#### Q2 - `RECHECK`

At the moment of a query the indexer database has indexed transactions up to the block number `N`. These cases can happen:
- in case `blockNumber` is greater or equal to `N + 1`, empty transaction reponse with status `NOT_EXIST` is returned
- otherwise we check if a transaction with hash `txId` and `blockNumber` exists. If it does not exist, empty transaction reponse with status `NOT_EXIST` is returned. 
- if transaction with `txId`and `blockNumber` exists, then we check for existence of the confirmation block with hash `dataAvailability`. We check this by using the query `Q1`. If the confirmation block exists and it is on the correct height (e.g exactly `blockNumber + 6` for Bitcoin) then stored transaction API response is returned with status `OK`. Otherwise empty transaction response with status `NOT_EXIST` is returned.

### Q3 - referenced transaction non-existence

Inputs:
- `payementReference` - payment reference
- `blockNumber` - last block number to check (defines upper bound of search interval)
- `dataAvailability` - hash of confirmation block for `endBlockNumber` (used for syncing of edge-cases)
- `type` - `FIRST_CHECK` or `RECHECK`

The query returns a list of transactions in interval from the lower bound to the `blockNumber`. Boundary checks for `blockNumber` are handled in the same manner as with `Q2` (`FIRST_CHECK` and `RECHECKED`). The query can return only two statuses: `OK`, `RECHECK`. With status `OK` the list of candidate transactions matching the query interval and payment reference is provided. If no such transactions are found, empty list is returned.

The response structure looks like this:

```
{
   status: "OK" | "RECHECK" | "NO_CONFIRMATION_BLOCK",
   transactions?: any[]
   block?: any
}
```

When rechecking it is important to find confirmation block. Otherwise the returned status is `NO_CONFIRMATION_BLOCK`, and verification process should treat this as non-ability to prove non-existence.




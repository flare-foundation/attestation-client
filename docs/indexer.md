# Indexer

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

Two types of queries are supported:
- (Q1) - block hash existence check
- (Q2) - transaction existence check
- (Q3) - referenced transaction non-existence

Each attestation request will provide 
- `roundId`
- `txId`
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
- `roundId`

If the block with `hash` is stored in the database, it returns a stored block API response subject to timestamp being greater or equal to `TMIN(roundId)`. In case the block is not found in database, query to blockchain is carried out for UTXO chains and result is returned. The reponse contains `status` field, that can be `OK` or `NOT_EXIST`. In case of status `NOT_EXIST`, the `block` field is empty.

Teh response structure
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

- `blockNumber` is strictly lower than `N - 1`. Then all transactions in the block with the `blockNumber` exist in the indexer database. Query is carried out on the database and if `txId` exists in the confirmed block with `blockNumber`, the stored transaction API response is returned with status `OK`. Confirmation block `dataAvailability` hash is not used in this case.
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
- `blockNumber` - last block number to check
- `dataAvailability` - hash of confirmation block for `endBlockNumber` (used for syncing of edge-cases)
- `endBlockNumber` - end block number to which the transaction has to appear in
- `endTimestamp` - voting round id for check
- `type` - `FIRST_CHECK` or `RECHECK`

The query returns a list of transactions in interval from the lower bound to the `blockNumber`. Boundary checks for `blockNumber` are handled in the same manner as with `Q2` (`FIRST_CHECK` and `RECHECKED`). The query can return only two statuses: `OK`, `RECHECK`. With status `OK` the list of candidate transactions matching the query interval and payment reference is provided. If no such transactions are found, empty list is returned.

The response structure looks like this:

```
{
   status: "OK" | "RECHECK",
   transactions?: any[]
}
```








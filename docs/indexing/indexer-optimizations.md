# Indexer optimizations

Indexers collect lots of data and as time goes by, tables become bigger and queries slower. Slower queries could have impact on the attestation system, as flooding the system with nonsense requests to such an extent, that 90 seconds would not be enough to check all of them, is itself a form of a DOS attack on the system. In addition, syncing indexers also takes some time, and if an attestation provider wants to restart or is recovering, the syncing procedure should not last too long. These are the main reasons for choosing limited indexing time windows.

## Double transaction tables

A part of maintaining limited history storage is also efficiently deleting the old data, the one that falls out of the indexing time window.
The table of blocks is very light and essentially does not need cleaning up of old blocks. On the other hand, the transactions table can become quite large, as there are way more transactions than blocks in blockchains, and transaction entries are heavier, containing more indexed fields and potentially much heavier `response` fields. Deleting old transactions periodically could be tricky and could put some load on the database. Instead of that we chose to use two tables, where each table fills transaction until the indexing time window time has passed. Then we switch to the other table. If the other table is not empty, we just drop it prior to switching. The drop is practically an instant operation. In this way we always cleanup the indexes and row counters get reset. The cost is, that we have to make queries into two tables each time.

## API request rate limiting and caching

In our implementation in Node.js, we use our _Multi Chain Client_ library `flare-mcc`. It contains an `axios` client to communicate with blockchain APIs. We have upgraded the client to support rate limiting and request caching. Rate limiting is important to ensure stability of communication with API nodes, in order to not get rate limited or cause problems on the nodes. Typically, requests from indexers include just the following calls to the blockchain API:

- Get transactions by transaction id
- Get block by block number or hash
- Get block height

Next: [Attestation types](../attestation-types/attestation-types.md)

[Back to Home](../README.md)

[TOC](../README.md)
# Indexer optimizations

Indexers collect lots of data and as the time goes by, tables can become bigger and queries slower. Slower queries could have impact on the attestation system, as flooding the system with nonsense requests to such an extent, that 90 seconds would not be enough to check all of them, is itself a form of a DOS attack on the system. In addition, syncing indexers also takes some time, and if attestation provider wants to start or is in recovering, the syncing procedure should not last too long. These are the main reasons for choosing limited indexing time windows.

## Double transaction tables

A part of maintaining limited history storage is also efficiently deleting the old data, that fall out of the indexing time window.
The table of blocks is very light and essentially does not need cleaning up of old blocks. On the other hand, the transactions table can become quite packed, as there are way more transactions then blocks in blockchains and transaction entries are more heavy, containing more indexed fields and potentially much more heavier `response` field. Deleting old transactions periodically could be tricky and could put some load on the database. Instead of that we chose to use to tables, where each table fills transaction until the indexing time window time has passed. Then we switch to the other table. If the other table is non empty, we just drop it prior to switching. The drop is practically an instant operation. In this way we always cleanup the indexes and row counters get reset. The cost is, that we have to make queries into two tables each time.



## API request rate limiting and caching

In our implementation in Node.js we use our _Multi Chain Client_ library `flare-mcc`. In contains `axios` client to communicate with blockchain APIs. We have upgraded the client to support rate limiting and request caching. Rate limiting is important to ensure stability of communication with API nodes, in order to not get rate limited or cause problems on the nodes. Typically requests from indexers include just the following calls to the blockchain API:
- get transactions by transaction id,
- get block by block number or hash,
- get block height.

Caching of API responses is important mainly for transactions. An important use case is in case of Bitcoin and other Bitcoin code based UTXO blockchains. Namely, in UTXO blockchains a source address is obtained by querying the blockchain API for each transaction on each input. There can be up to 20 inputs and possibly many different UTXO outputs from different transactions. Usually we can get a block info and info of all transactions in the block in one request. But then we have to make for each of those transactions many requests for input transactions. Those could repeat and caching responses helps here a bit. Note that some blocks can have even over 2000 transactions and some experimental calculations showed that we would do for each transaction even than 4 additional API calls on average for input transactions. With Bitcoin blocks of over 2000 transactions this may take even 5 minutes. Compared to 10 minute average block production of Bitcoin the indexing would take quite some time. Also, the most critical requirement for an indexer is that confirmed transactions are stored into the database immediately after the confirmation block arrives. Hence we have to process transactions from unconfirmed blocks in advance. Since unconfirmed blocks may be in different forks, we might be processing wrong fork. But what we know is that even we are in the wrong fork, transactions in that wrong block will be similar. So here caching can also help a lot. Also noted, that we used another optimization, namely we read all inputs of all transactions that have payment reference defined only. For others, it depends on attestation type, whether we do additional reads during verification phase or not.


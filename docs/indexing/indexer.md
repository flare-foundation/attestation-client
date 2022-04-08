# Blockchain indexer

The main data structure of blockchains typically consists of a sequence of blocks, where each block contains transactions in a specific order.
Each block is identified by a block hash and has a specific block number (height). Each transaction is identified by a transaction id (hash). Blockchain nodes have APIs that allow reading blocks and transactions. An indexer is used to collect the data about the blocks and transactions for a certain period and enable users to make certain types of queries fast. In our use case of attestation providers, indexers are used to read transactions within a certain **indexing time window**  from present back to some past time, for example for the last two days (duration `IndexingWindowSec`).

For further details about indexer, follow the links:
- [Scope of indexing](./indexer-scope.md)
- [Sinchronized query window](./synchronized-query-window.md)
- [Optimizations](./indexer-optimizations.md)





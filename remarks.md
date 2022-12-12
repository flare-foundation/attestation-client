For tests that use database, a mysql database has to be run locally.

A lot of tests use MCC client that is not mocked. Appropriate API credentials have to be set for these.

dbBlock.ts, dbTransaction.ts: added interface for correct typing

BaseEntity.ts, dbTransaction.ts : Why we do not use transactionId as the primaryColumn??

MerkleTree.ts : verify has to be independent of merkle tree

indexerToDB.ts : do we want to drop tables truncate them?

indexerToClient : we do not use cached client at all!!!

ChainConfiguration.ts, IndexerConfiguration.ts : is it static? if not how are changes provided?

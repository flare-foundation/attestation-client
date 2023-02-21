# Attestation suite

Attestation suite is the set of services that allow attestation providers to participate in the attestation protocol. 
On a high level in includes: 

- [Attestation client](./attestation-client.md) - monitors a flare blockchain for attestation requests, forwards requests to verification servers, collect the verifications/rejections, prepares votes for each voting round and votes.
- [Verifier](../verfication/verifier.md) - deployed per data source (e.g. blockchain) and are in charge for verification of specific attestation requests. Have access to an indexer data base that is used to make queries needed to verify attestation requests. An important part of the verifier server is 
verification code, which carries relevant queries to the indexer database and performs relevant checks, as required by a specific attestation type. 
- [Indexers](../indexing/indexer.md) - read block chain nodes (or a data source in general) and prepare a queryable database subject to limitation, that are relevant for specific attestation types (e.g. all indexed transactions in the database have a sufficient number of confirmations). Indexers typically use interfacing library to read from a blockchain node (e.g. [Multi Chain Client]())
access blockchain nodes
- [Blockchain nodes](./blockchain-nodes.md) - block chain nodes


Next: [Attestation Client](./attestation-client.md)

[Back to home](../README.md)

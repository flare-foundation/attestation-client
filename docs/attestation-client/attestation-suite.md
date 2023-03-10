# Attestation suite

Attestation suite is the set of services that allow attestation providers to participate in the attestation protocol. 
On a high level in includes: 

- [Attestation client](./attestation-client.md) - monitors a Flare blockchain for attestation requests, forwards requests to verification servers, collect the verifications/rejections, prepares votes for each voting round and votes.
- [Verifiers](../verfication/verifier.md) - a verifier is deployed as an API server per data source (e.g. blockchain) and are in charge for verification of specific attestation requests. A verifier has access to an indexer database that is used to carry out queries needed to verify attestation requests. An important part of the verifier server is the
verification code, which performs relevant queries to the indexer database and carries out relevant checks, as required by a specific attestation type. 
- [Indexers](../indexing/indexer.md) - an indexer reads blockchain nodes (or a data source in general) and prepares a queryable database, subject to limitations, that are relevant for specific attestation types (e.g. all indexed transactions in the database have a sufficient number of confirmations). Indexers typically use interfacing library to read from a blockchain node (e.g. [Multi Chain Client](https://github.com/flare-foundation/multi-chain-client)).
- [Blockchain nodes](./blockchain-nodes.md) - block chain nodes.

Next: [Attestation Client](./attestation-client.md)

[Back to home](../README.md)

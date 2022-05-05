# Attestation client - installation and technical reference

## Installation and running the attestation client 
- [General installation](./installation/general-installation.md)
  - [Indexer installation](./installation/indexer-installation.md)
  - [Attestation client installation](./installation/attester-client-installation.md)
- [Configuration](./config/config-general.md)
  - [Attestation client](./config/config-attester-client.md)
- Monitoring tools
## Technical reference

- [Attestation protocol](./attestation-protocol/attestation-protocol.md)
  - [State connector contract](./attestation-protocol/state-connector-contract.md)
  - [Merkle tree and Merkle proofs](./attestation-protocol/merkle-tree.md)
  - [Limiting attestation requests](./attestation-protocol/attestation-limiter.md)
- [Indexer](./indexing/indexer.md)
  - [Scope of indexing](./indexing/indexer-scope.md)
  - [Synchronized query window](./indexing/synchronized-query-window.md)
  - [Optimizations](./indexing/indexer-optimizations.md)
- [Attestation types](./attestation-types/attestation-types.md)
  - Adding new attestation types
  - [00001 - Payment](attestation-types/00001-payment.md)
  - [00002 - Balance Decreasing Transaction](attestation-types/00002-balance-decreasing-transaction.md)
  - [00003 - Confirmed Block Height](attestation-types/00003-confirmed-block-height-exists.md)
  - [00004 - Referenced Payment Nonexistence](attestation-types/00004-referenced-payment-nonexistence.md)


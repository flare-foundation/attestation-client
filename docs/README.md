# Attestation client installation and technical reference

## For attestation providers

- [Dockerized installation](../deployment/README.md)
- [Configurations](./config/configuration-system.md)

## For dApp developers

- [General usage](./end-users/state-connector-usage.md)
- [Available attestation types](https://github.com/flare-foundation/state-connector-attestation-types)
- [REST APIs provided by attestation providers](./end-users/apis.md)
- [Verification smart contract and usage workflow](./end-users/verification-workflow.md)

## Technical reference

- [Attestation protocol](./attestation-protocol/attestation-protocol.md)
  - [State connector contract](./attestation-protocol/state-connector-contract.md)
  - [Bit voting](./attestation-protocol/bit-voting.md)
  - [Merkle tree and Merkle proofs](./attestation-protocol/merkle-tree.md)
  - [Limiting attestation requests](./attestation-protocol/attestation-limiter.md) 
- [Attestation Suite](./attestation-client/attestation-suite.md)
  - [Attestation Client](./attestation-client/attestation-client.md)
  - [Indexer](./indexing/indexer.md)
    - [Scope of indexing](./indexing/indexer-scope.md)
    - [Optimizations](./indexing/indexer-optimizations.md)
  - [Verifier](./verfication/verifier.md)
    - [Code generation](./verfication/code-generation.md)
  - [Multi-Chain-Client](https://github.com/flare-foundation/multi-chain-client)
  - [Blockchain nodes](./attestation-client/blockchain-nodes.md)
  - [Configuration system](./config/configuration-system.md)

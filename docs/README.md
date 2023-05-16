# Attestation Client Installation and Technical Reference

## For Attestation Providers

- [Attestation Suite Installation](../deployment/README.md)
- [Direct Installation to a Linux Machine](./installation/direct-installation.md)
- [Configuration System](./config/configuration-system.md)

## For dApp Developers

- [Using State Connector System](./end-users/state-connector-usage.md)
- [State Connector Attestation Types](https://github.com/flare-foundation/state-connector-attestation-types)
- [REST APIs for Attestation Providers](./end-users/apis.md)
- [Verification Smart Contract and Workflow](./end-users/verification-workflow.md)

## Technical Reference

- [Attestation Protocol](./attestation-protocol/attestation-protocol.md)
    - [State Connector Contract](./attestation-protocol/state-connector-contract.md)
    - [Bit Voting](./attestation-protocol/bit-voting.md)
    - [Message Integrity Checks](./attestation-protocol/message-integrity.md)
    - [Merkle Tree](./attestation-protocol/merkle-tree.md)
    - [Voting Behavior of Attestation Providers](./attestation-protocol/voting-behavior.md)
    - [Limiting the Number of Attestation Requests](./attestation-protocol/attestation-limiter.md)
- [Attestation Suite](./attestation-client/attestation-suite.md)
    - [Attestation Client](./attestation-client/attestation-client.md)
        - [A List of Env Variables](./attestation-client/env-variables.md)
    - [Blockchain Indexer](./indexing/indexer.md)
        - [Scope of Indexing](./indexing/indexer-scope.md)
        - [Indexer Optimizations](./indexing/indexer-optimizations.md)
    - [Verifier](./verfication/verifier.md)
    - [Code Generation](./verfication/code-generation.md)
    - [Multi-Chain Client](https://github.com/flare-foundation/multi-chain-client)
    - [Blockchain Nodes](./attestation-client/blockchain-nodes.md)
    - [Configuration System](./config/configuration-system.md)
    - [Testing](./misc/testing.md)

## Attestation types

Attestation providers provide attestations only for specific types of requests. These types are called _attestation types_ and have to be designed in such a way that that they are clear-cut decidable. Clear-cut decidability includes the requirement of having a synchronized view on data from external data sources (e.g. other chains) that are used for data attestations. For example, in slower block producing blockchains like Bitcoin, one attestation provider may see a certain block at the moment of query while the other may not see it yet, as the block might not have been fully distributed throughout the network. Such providers would yield completely different attestations. Hence special data view synchronization protocols have to be applied.

Synchronized data views are also important due to representation of the submitted vote by the Merkle root of all attestations in the voting round. In case of non-synchronized data views, data providers would often vote differently on the most recent attestation requests (depending on the time of query), which would yield completely different Merkle roots and thus cripple the voting round, as achieving at least 50% of all submitted Merkle roots would become extremely difficult. Attestation types and mechanisms to achieve data view synchronization will be described later.

### Attestation type definitions

Each attestation type is defined by:
- **request format** - the data that is encoded into the attestation request bytes.
- **verification rules** - the rules attestation providers need to carry out, that include querying specific external sources (e.g. blockchains) and 
- **response format** - defines, which data (and data types) are obtained from the sources and how are hashed if attestation provider is able to verify the attestation request successfully. 

### Existing attestation types

The following attestation types are currently defined:
- [00001 - Payment](attestation-types/00001-payment.md)
- [00002 - Balance Decreasing Transaction](attestation-types/00002-balance-decreasing-transaction.md)
- [00003 - Confirmed Block Height](attestation-types/00003-confirmed-block-height-exists.md)
- [00004 - Referenced Payment Nonexistence](attestation-types/00004-referenced-payment-nonexistence.md)


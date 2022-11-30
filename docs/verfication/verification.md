# Verification system

In order to use or introduce new attestation types, a type needs to be well defined and approved by the attestation type community on the [State Connector attestation type repo](https://github.com/flare-foundation/state-connector-attestation-types). Once a definition is approved, the procedures for implementing it into the attestation client code can start. When implemented, attestation providers start supporting new attestations from the certain voting round on, agreed on by the attestation provider community.

To support easier implementation of the new attestation types the Attestation Client Suite includes [code generation utilities](./code-generation.md) which help in including new and updating existing attestation types in a standardized manner.

Verification system consists of several parts. The first part involves [attestation types](https://github.com/flare-foundation/state-connector-attestation-types), including the formats of attestation requests, attestation responses and the rules for verification. These closely relate to the main job of the attestation client, namely receiving and parsing the attestation requests, querying indexers and RPC APIs of the blockchain nodes, verifying the data according to the rules, and then calculating the attestation responses, in cases of successful attestations. And of course, building the Merkle tree, extracting the Merkle root and submitting the votes.

The second part of the attestation system relates to an actual application of the attestations as the proofs within smart contracts, hence the validation of the proved data. It consists a smart contract implementing the validation protocol. Such a protocol uses the list of the confirmed Merkle roots from the State Connector contract representing the accepted Merkle roots, and accepts as an input the following parameters, that constitute the attestation proof:
- attestation response,
- Merkle proof,
- voting round id of in which the attestation was confirmed.

The applicant (user) wanting to prove something to the contract is required to provide the attestation proof data to the smart contract. For that the applicant first needs to obtain all the attestation requests (votes) for a specific voting round from an attestation provider that voted correctly through its [Proof APIs](proof-api.md). A part of the Proof API response are all attestation responses, from which the applicant can assemble the Merkle tree of the voting round. If the attestation provider was voting correctly, the Merkle root of the assembled Merkle tree should match the accepted Merkle root on the State Connector contract.Then the applicant extracts the specific attestation response from the Proof API response, and the Merkle proof from the Merkle tree, matching the attestation. Having all the attestation proof data, the applicant (user) can submit the attestation proof to the smart contract. For easier understanding, see an [example attestation verification workflow](./verification-workflow.md).

Next: [Code generation](./code-generation.md)

[Back to home](../README.md)

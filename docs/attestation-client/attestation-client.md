[TOC](../README.md)

# Attestation client

We provide an application [AttestationClient](../../src/attester/AttesterClient.ts) that implements attestation protocol and manages interaction with `StateConnector` and `BitVoting` contracts.

The application collects listens to the events emitted by `StateConnector` and `BitVoting` contract. Collection of events is managed by [FlareDataCollector](../../src/attester/FlareDataCollector.ts). There are three types of events: attestation requests, bitVotes, and event that signalizes the end of a voting round.

- Attestation request is read and parsed into [Attestation](../../src/attester/Attestation.ts) that is assigned to an [AttestationRound](../../src/attester/AttestationRound.ts) according to the timestamp. Attestation is than passed to a verifier. Verifier for a given attestation is assigned by [SourceManager](../../src/attester/source/SourceManager.ts). Verifier sets [AttestationStatus](../../src/attester/types/AttestationStatus.ts) and [Verification](../../src/verification/attestation-types/attestation-types.ts) that the answer to the request. The attestations in a given round are sorted by the order of arrival and marked by `1` if AttestationStatus is valid an `0` otherwise. Marks are collected into BitVote and sent to `BitVoting` contract in the first 45s of the choose round.

- BitVote is read and parsed into [BitVoteData](../../src/attester/BitVoteData.ts) that is assigned to an attestation round according to the timestamps. After BitVotes of all attesters are collected, the result of bit voting is calculated and attestation that were chosen are marked.

Hashes of verifications of all attestations that are valid and chosen are collected, sorted and assembled into a Merkle tree. The Merkle root is masked with a random number. Near the end of the commit phase, masked Merkle root is submitted to `StateConnector` together with the Merkle root and the random number of the previous round.

Functions that manage submissions to `StateConnector` and `BitVoting` are in [FlareConnection](../../src/attester/FlareConnection.ts)

Managing attestation rounds is done by [AttestationRoundManager](../../src/attester/AttestationRoundManager.ts)

Next: [Configurations](./attestation-configs.md)

[Back to home](../README.md)

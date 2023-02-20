# Attestation client

Attestation client is a central service run by an attestation provider. Its main roles include:
- monitoring Flare blockchain for attestation requests and collecting them from `StateConnector` smart contract,
- scheduling attestation requests to the rounds and forwarding them to the verifier servers,
- collecting the verifications/rejections from verifier servers,
- participating in bit-voting on `BitVoting` smart contract,
- assembling the merkle tree from bit-voted and verified requests,
- carrying out the attestation protocol voting.

The implementation of the attestation client includes several important classes.
The top level class [AttesterClient](../../src/attester/AttesterClient.ts) runs all sub modules.
 
The application listens to the events emitted by `StateConnector` and `BitVoting` contract. Collection of events is managed by [FlareDataCollector](../../src/attester/FlareDataCollector.ts). There are three types of events: attestation requests, bit-votes, and events that signalize the finalisation of a voting round.

Attestation request is read and parsed into class [Attestation](../../src/attester/Attestation.ts) that is assigned to an [AttestationRound](../../src/attester/AttestationRound.ts) according to the roundId determined by the [`block.timestamp`](./../end-users/state-connector-usage.md#round-id-of-the-attestation-request). `Attestation` is then passed to [SourceManager](../../src/attester/source/SourceManager.ts). `SourceManager` communicates with external verifiers in order to obtain responses for attestation requests. Based on those responses the values of [AttestationStatus](../../src/attester/types/AttestationStatus.ts) and [Verification](../../src/verification/attestation-types/attestation-types.ts) within `Attestation` are set. The attestations in a given round are sorted by the order of arrival (duplicates omitted) and marked by `1` if AttestationStatus is `valid` an `0` otherwise. If the attestation client runs as a part of a default set, marks are collected into bit vector (bit-vote) and sent to `BitVoting` contract before the end of the choose round.

`BitVote` event emitted by each bit-vote sent by attestation clients is read and parsed into [BitVoteData](../../src/attester/BitVoteData.ts) that is assigned to an attestation round according to the timestamps. After bit-votes of all attesters in the default set are collected (after the end of choose phase), the result of bit voting is calculated and attestation that were chosen are marked for inclusion into the Merkle tree.

Hashes of verifications of all attestations that are valid and chosen are collected, sorted and assembled into a Merkle tree. The Merkle root is masked with a random number. Near the end of the commit phase, masked Merkle root is submitted to `StateConnector` together with the revealed Merkle root and the random number of the previous round. Attestation requests that are valid and chosen are stored in the database to provide Merkle proofs that enable a use of the valid request on the blockchain.

On the round finalization event (triggered by the validator while counting the votes) the committed Merkle root is checked against the majority Merkle root just for logging purposes.

Functions that manage submissions to `StateConnector` and `BitVoting` are in [FlareConnection](../../src/attester/FlareConnection.ts).

Managing attestation rounds is done by [AttestationRoundManager](../../src/attester/AttestationRoundManager.ts). This includes creating attestation rounds, routing requests to the correct attestation rounds, time scheduling of actions in the life-cycle of each attestation round, overall initialization and config management.

Next: [Configurations](./attestation-configs.md)

[Back to home](../README.md)

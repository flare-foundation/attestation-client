# Voting behavior of attestation providers

Sufficient number of well behaving attestation providers is crucial for the Attestation protocol to work properly. In essence, the role of the
default set is to propose the result of all verified attestations for each round, while the role of the local sets, especially on validator nodes, is to supervise the actions of the default set, and in case of a malicious proposal, collectively force a fork, where the proposal (voting result) of the default set is rejected.

## Attestation type requirements

To enable an option of disagreement on an attestation request, each attestation type needs to be defined in such a way, that the attestation provider can clearly determine the validity situation of each attestation request as one of:

- `valid`,
- `invalid`,
- `indeterminate`.
  Note that the attestation request whose [MIC](./message-integrity.md) does not match the attestation response is considered `invalid`. If attestation request exceeds the globally defined limit (global configurations), then it is also considered `invalid`.

While validating, attestation providers may not have full data available. For example, they could have available only a limited recent history indexed for some blockchain. To enable better capability of rejecting invalid attestation requests, the attestation types should be formulated in such a way that one can do a two step verification:

- check for sufficient data availability on attestation provider infrastructure.
- If data availability is not sufficient, the validation result should be `indeterminate`.
- If required data is fully available, a query can be made and a deterministic check carried out to yield exactly one of the results: `valid` or `invalid`.

For example, this implies that a well formed payment confirmation request should include both transaction id and block number.
When verifying it, a query to a possibly limited indexer database should first verify whether all the data for the given block number are in the database (sufficient data availability). If data is available (the full block data), then a deterministic verification is possible yielding the one of the results `valid` or `invalid`. On the other hand, if no data about the block are available, the result of the validation should be `indeterminate`. This design with more specific conditions enables easier identification of invalid requests by using less resources (e.g. limited history indexers).

## Attestation provider behavior

For each round, the default set carries out the [bit-voting](./bit-voting.md) and all attestation providers agree on the result. The bit-vote result determines, what goes into the Merkle tree for the round.  
Based on verifications carried out, an attestation provider should try to assemble the relevant
Merkle tree. While assembling the Merkle tree, these cases can happen:

- All bit-voted attestations are found `valid` (**confirm**).
- At least one bit voted attestation is found `invalid` (**reject**).
- There are no `invalid` attestations, but some of them are `indeterminate` (**abstain**).

Hence, a well behaved attestation provider should act as follows:

- On **confirm**, it should assemble the full Merkle tree matching the bit-vote result and vote with the Merkle root.
- On **reject**, it should use the zero Merkle root and vote with it. The prescribed rejection behavior is necessary since if such an attestation provider is included in some local set, the local set can reach rejection consensus with the zero Merkle root and collectively reject the default set's voting result.
- On **abstain**, there are two options. The first one is not to vote. But since each `submitAttestation` call involves reveal for one round and commit for the next round, voting for two sequential rounds may require abstaining for one and voting and accepting/rejecting the other. In this case we note, that there are actually two ways of abstaining:
  - not sending anything, or
  - sending an inconsistent commit-reveal pair.
    The first option can be used only if both rounds involved in `submitAttestation` are to be abstained.

Note that in essence non-default attestation providers (local set only) essentially need not to fully participate in Merkle root voting. They can try to verify only specific attestation requests. In such a case, they will almost never be able to assemble a Merkle tree and hence confirm a vote, but they may reject the vote by submitting valid zero Merkle tree (reject), in case they  
find out the bit-vote contains an invalid attestation. In such a case, the default set may or may not end up confirming the bit-voted Merkle tree, but the local set would surely reject it, if it turns out to get confirmed. Such a "partial" attestation provider used in a private set would either abstain or reject votes, but never confirm them.

Next: [Limiting attestation requests](./attestation-limiter.md)

[Back to home](../README.md)

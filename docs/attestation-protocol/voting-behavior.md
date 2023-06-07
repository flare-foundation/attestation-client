# Voting Behavior of Attestation Providers

Sufficient number of well behaving attestation providers is crucial for the Attestation protocol to work properly. In essence, the role of the
default set is to propose the result of all verified attestations for each round, while the role of the local sets, especially on validator nodes, is to supervise the actions of the default set, and in case of a malicious proposal, collectively force a fork, where the proposal (voting result) of the default set is rejected.

The Flare validator nodes have built in the [Branching protocol](https://docs.flare.network/tech/state-connector/#branching-protocol). The specific active and audited implementation inside the validator node can be seen [here](https://github.com/flare-foundation/go-flare/blob/main/coreth/core/state_connector.go#L226).
The essence of the Branching protocol is that each validator or non-validator node can have a local set of attestation providers set (their addresses).
Only in the case the default set accepts in some round some Merkle root and the local set accepts a completely different Merkle root, the node rejects the operation of accepting the Merkle root proposed by the default set being written into the EVM variable. This causes the node to end up in a different state/fork than nodes that accept the Merkle root proposed by the default set.

Consider validators having their local sets configured and say some local sets reject the Merkle root proposed in a round. Then the set of validator nodes would split in two partitions. If one partition has sufficient weight (Flare uses Proof of stake), then that partition would continue to operate, while nodes in the other partition get stuck. Only one of the two partitions/choices is correct in reality, namely the Merkle root proposed by the default set can be confirming only the correct information or there may be at least one wrong confirmation. This is a critical network error and an important security feature. The resolution is then carried out through validators deciding which fork they should proceed with. Note that if one of the forks has sufficient weight, then this decision has already been made by majority of validators and the ones in the other fork, which got stuck need to do the following.

- Shut down the node gracefully.
- Set the local set in such a way that it voted correctly on the block the conflict happened. This means either removing the existing local set that voted incorrectly or assembling the local set by attestation providers' addresses that happened to vote correctly for the conflicting round.
- Restart the node and progress with syncing.

Note that if a situation of proper majority rejection of the default set vote ever happens, the fresh node that will sync from start will need to carry out a rejection in the particular block, otherwise they will get stuck. Since this situation is clearly defined, an updated node version will be released with special behavior being hardcoded in the specific block.

It is in the best interest for any node manager, being a validator or not, to have a trusted and honest local set, preferably even a single attestation provider, run by themselves. In this setting, the validator node actually becomes a generalized validator, basically validating both chain transactions and State Connector requests. In order to not cause unnecessary forks on a specific node, that are different than the rest (majority) of the network, it is of of **utmost importance that local set is active and behave well**. Note that also not having an operational local set will, in a situation the Merkle root is rejected by the majority of validator nodes though their local sets, cause the node to fork and get stuck.

In what follows we describe how local sets should behave in order to cause forks if and only if the default set is malicious or dysfunctional, which is the desired security feature of the State Connector and Flare network validation behavior.

## Attestation Type Requirements

To enable an option of disagreement on an attestation request, each attestation type needs to be defined in such a way, that the attestation provider can clearly determine the validity situation of each attestation request as one of:

- `valid`,
- `invalid`,
- `indeterminate`.
  Note that the attestation request whose [MIC](./message-integrity.md) does not match the attestation response is considered `invalid`. If the attestation request exceeds the globally defined limit (global configurations), then it is also considered `invalid`.

While validating, attestation providers may not have full data available. For example, they could have available only a limited recent history indexed for some blockchain. To enable better capability of rejecting invalid attestation requests, the attestation types should be formulated in such a way that one can do a two step verification:

- check for sufficient data availability on attestation provider infrastructure.
- If data availability is not sufficient, the validation result should be `indeterminate`.
- If required data is fully available, a query can be made and a deterministic check carried out to yield exactly one of the results: `valid` or `invalid`.

For example, this implies that a well formed payment confirmation request should include both transaction id and block number.
When verifying it, a query to a possibly limited indexer database should first verify whether all the data for the given block number are in the database (sufficient data availability). If data is available (the full block data), then a deterministic verification is possible yielding the one of the results `valid` or `invalid`. On the other hand, if no data about the block are available, the result of the validation should be `indeterminate`. This design with more specific conditions enables easier identification of invalid requests by using less resources (e.g. limited history indexers).

## Attestation Provider Behavior

For each round, the default set carries out the [bit-voting](./bit-voting.md) and all attestation providers agree on the result. The bit-vote result determines what goes into the Merkle tree for the round.
Based on verifications carried out, an attestation provider should try to assemble the relevant
Merkle tree. While assembling the Merkle tree, these cases can happen:

- All bit-voted attestations are found `valid` (**confirm**).
- At least one bit voted attestation is found `invalid` (**reject**).
- There are no `invalid` attestations, but some of them are `indeterminate` (**abstain**).

Hence, a well behaved attestation provider should act as follows:

- On **confirm**, it should assemble the full Merkle tree matching the bit-vote result and vote with the Merkle root.
- On **reject**, it should use the zero Merkle root and vote with it. The prescribed rejection behavior is necessary since if such an attestation provider is included in some local set, the local set can reach rejection consensus with the zero Merkle root and collectively reject the default set's voting result.
- On **abstain** there are two options. The first one is not to vote. But since each `submitAttestation` call on the `StateConnector` smart contract involves the reveal data for one round and the commit data for the next round, voting for two sequential rounds may require abstaining for one and voting and accepting/rejecting the other. In this case we note, that there are actually two ways of abstaining:

- not sending anything, or
- sending an inconsistent commit-reveal pair.

The first option can be used only if both rounds involved in the `submitAttestation` call are to be abstained.

Note that in essence non-default attestation providers (local set only) essentially need not to fully participate in Merkle root voting. They can try to verify only specific attestation requests. In such a case, they will almost never be able to assemble a Merkle tree and hence confirm a vote, but they may reject the vote by submitting valid zero Merkle tree (reject), in case they find out the bit-vote contains an invalid attestation. In such a case, the default set may or may not end up confirming the bit-voted Merkle tree, but the local set would surely reject it, if it turns out for the Merkle root proposed by the default set to get confirmed. Such a "partial" attestation provider used in a local set would either abstain or reject votes, but never confirm them.

Next: [Limiting Attestation Requests](./attestation-limiter.md)

[Back to Home](../README.md)

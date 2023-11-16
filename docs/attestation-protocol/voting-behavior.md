# Voting behavior of attestation providers

Sufficient number of well behaving attestation providers is crucial for the Attestation protocol to work properly. In essence, the role of the
default set is to propose the result of all verified attestations for each round, while the role of the local sets is to supervise the actions of the default set, and in case of a malicious proposal, enter into a fork, where the proposal (voting result) of the default set is rejected.

The Flare validator nodes have built in the [Branching protocol](https://docs.flare.network/tech/state-connector/#branching-protocol). The specific active and audited implementation inside the validator node can be seen [here](https://github.com/flare-foundation/go-flare/blob/main/coreth/core/state_connector.go#L226).
The essence of the Branching protocol is that each node can have a local set of attestation providers set (their addresses).

The branching protocol on a specific node is enabled as soon as a local set is configured. It activates in a situation where the local set's Merkle root is different then the default set's. This includes also the situation, where local set does not produce its own Merkle root (no vote or too late voting). The situation causes the node to end up in a different state/fork compared to nodes that accept the Merkle root proposed by the default set. Due to lack of the consensus, the node gets stuck. Due to this property, the branching protocol is not recommended to be used on validator nodes as they may fork too often due to delays or issues with the local set. The purpose of the branching protocol is to provide additional protection to actors in the network which handle bigger amounts of funds and want to detect as soon as possible, whether something is wrong with the network.
## Attestation type


Each attestation type needs to be defined in such a way, that the attestation provider can clearly determine the validity situation of each attestation request as one of:

- `valid`,
- `invalid`,
- `indeterminate`.

Note that the attestation request whose [MIC](./message-integrity.md) does not match the attestation response is considered `invalid`. If the attestation request exceeds the globally defined limit (global configurations), then it is also considered `invalid`.

Well behaved default set should always produce bit voting result of `valid` attestations and well behaved attestation providers should produce the Merkle root matching to the result of bit-voting. Having more members in the default set increases the chances that all well behaving attestation providers can confirm all attestations proposed by bit-voting. 
A malfunctioning infrastructure at a member of a local set (like issues with any external network node or verifier) will cause the node to fork.

[Back to home](../README.md)

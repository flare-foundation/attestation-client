# Message Integrity Checks

While [bit voting](./bit-voting.md) in the choose phase ensures agreement on which attestation should be put in the Merkle tree, there is no insurance that all attestation providers will be able to build the same Merkle tree and thus obtain the same Merkle root to vote with. Namely, attestation providers could (usually due to a bug in the code) have issues with consistency of the data obtained from the data source or issues related to calculating the hash of the relevant data, before putting it into the Merkle tree. For that reason, each attestation request contains the **message integrity code**. This is the hash of the attestation response and the string `Flare`.

Each non-malicious requester should already know what the attestation response should be: They are just requesting the Attestation protocol to confirm the data in a decentralized and secure way, by the vote of the attestation providers. Therefore, they must provide the message integrity check. Upon making the query to the data source, the attestation provider appends the string `Flare` to its own response and calculates the hash. Only if this hash matches the message integrity code from the attestation request, is the attestation response considered valid and can be considered for inclusion in the Merkle tree.

Bit voting in combination with message integrity codes make the attestation protocol much more robust against attacks that could arise from misbehavior of a subset of attestation providers or bugs in attestation code.

Next: [Merkle Tree and Merkle Proof](./merkle-tree.md)

[Back to Home](../README.md)

# Voting behaviour of attestation providers

## Attestation type requirements 

To enable an option of disagreement on attestation request, each attestation type needs to be defined in such a way, that the attestation provider can clearly determine the validity situation of each attestation request as one of:
- `valid`,
- `invalid`,
- `indeterminate`.
Note that the attestation request whose MIC does not match the attestation response is considered `invalid`. Also if attestation request 
is over globally defined limit (global configurations) then it is also considered as `invalid`.

To achieve ability for rejecting attestation request, the attestation types should be formulated in such a way that one can do two step verification:
- checking for full data availability on a data source. 
- If data is not fully available, the validation should be `indeterminate`.
- If data is fully available, a query can be made and deterministic check carried out to yield exactly one of the results: `valid` or `invalid`.

For example, this implies that well formed payment confirmation request should include both transaction id and block number.
When verifying it a query to a possibly limited indexer database it should first verify whether all the data for the given block number are in the database (data availability). If data is available deterministic result (`valid` or `invalid`) should be returned. If not the result should be `indeterminate`. This design with more specific conditions enables easier identification of invalid request by using less resouces (like limited history indexer). 

## Attestation provider behavior

For each round, a bit-vote is agreed on. Bit vote determines, what goes into the Merkle tree for the round.  
Based on verifications carried out, an attestation provider should try to assemble the relevant 
Merkle tree. While assembling the Merkle tree, these cases can happen:
- All bit-voted attestations are found `valid` (**confirm**).
- At least one bit voted attestation is found `invalid` (**reject**).
- There are no `invalid` attestations, but some of them are `indeterminate` (**abstain**).

Hence, a well behaved attestation provider should act as follows:
- On **confirm** it should assemble the full Merkle tree matching the bit-vote result and vote with the Merkle root.
- On **reject** it should generate a zero commit hash in place of a Merkle root and vote with it. This behavior is necessary to cause for when the attestation provider is included in some private set and Merkle root matching to the bit-vote would be somehow accepted.
- On **abstain** there are two options. The first one is not to vote. But since each `submitAttestation` call involves reveal for one round and commit for the next round, voting for two sequential round may require abstaining for one and voting and accepting/rejecting the other. In this case we note, that there are actually two ways of abstaining:
  - not sending anything, or
  - sending an inconsistent commit-reveal pair.
The first option can be used only if both rounds involved in `submitAttestation` are to be abstained.

Note that the members of a private set need not fully participate in Merkle root voting. They can try to verify only specific attestation requests. 
They will not be able to assemble a Merkle tree in general and hence confirm a vote, but they may reject the vote with a random hash in place of Merkle root in case they  
find that the bit-vote contains an invalid attestation. In such a case the default set may or may not confirm the bit-voted Merkle tree, but the private set would surely reject it, if it happens to get confirmed. Such a "partial" attestation provider used in a private set would either abstain or reject votes, but never confirm them.

Next: [Limiting attestation requests](./attestation-limiter.md)

[Back to home](../README.md)

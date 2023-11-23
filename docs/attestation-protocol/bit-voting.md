# Bit Voting

Bit voting is a technique used to resolve an ambiguous attestation request.

Because the availability of data from a specific data source may vary, it can happen that not all data providers can confirm certain transactions or facts at any given time. For example, a transaction may be in a recent block, which is visible to some of the attestation providers but not yet to others. Also, the indexers of blockchain data that attestation providers use may have a limited history so that a transaction may be too old to be within the indexing window. The result is that some attestation providers can confirm it, but others cannot.

Since 50%+ of attesters have to submit the same Merkle root in order for it to be confirmed, at least that number of votes must be identical on all requests. Ambiguous decision requests can therefore disrupt the attestation process, resulting in several different non-majority Merkle roots being submitted. To sync the attestation providers on what can be jointly confirmed, the [**choose** phase](./attestation-protocol.md#five-phases-of-a-round) of the attestation protocol is used. It is called bit voting, because all attestation providers vote on how they want to attest for each received request, using one bit for each vote.

Here's how the choose phase works for bit voting: After collecting attestation requests, each attester enumerates the requests in order of arrival and queries for the existence of data needed for the attestation at relevant data sources (blockchain nodes, indexers,...). Confirmed requests are indicated by a `1` for _can validate_ or a `0` for _cannot validate_. They are stored into a bit array called `bitVote`, which is sent to the `BitVoting` contract.

Attestation providers use the `submitVote` method from the `BitVoting` contract to emit their vote in the choose phase. The first byte of the bit vote indicates the intended voting round for which the bit vote is carried out. Its value must be `roundId % 256` to be considered a valid vote. If an attester submits several votes, the last vote sent before the deadline is considered valid.

Attesters can listen to the emitted bit votes and use a deterministic algorithm to determine a subset of chosen requests such that enough attesters can get the data to decide on all of the requests in the subset. Then attestation providers only validate (include into the Merkle tree) the chosen requests.

Currently, `StateConnector` has a default set of 9 attestation providers. We need at least 5 to confirm a Merkle root. The calculation of the voting result proceeds as follows. Based on the fixed order of the attestation providers, we enumerate all the 5-subsets of the default set of the size 9. For each 5-subset, we calculate the joint intersection of votes and count the number of ones. The voting result is the intersection of the 5-subset, that has the most number of ones. If more 5-subsets, produce the same number of ones, the first according to the enumeration defines the result. The algorithm is used by each attestation provider separately. An attestation provider should either:

- Assemble the Merkle tree that includes the exact hashes of attestations for the chosen requests, and submit the Merkle root,
- Reject the proposed Merkle root with a valid zero (`0x000...000`), or
- Abstain from voting.

See [Voting Behavior of Attestation Providers](./voting-behavior.md).

Note that 5 attestation providers represent 50%+ of the default set. If the the chosen subset of 5 proposes to confirm an invalid attestation while bit voting, it implies that the majority of the default set is malicious or corrupted, which would require their replacement.

## BitVoting Contract Deployments in the Block Explorer

- [On Songbird](https://songbird-explorer.flare.network/address/0xd1Fa33f1b591866dEaB5cF25764Ee95F24B1bE64)
- [On Flare](https://flare-explorer.flare.network/address/0xd1Fa33f1b591866dEaB5cF25764Ee95F24B1bE64)
- [On Coston](https://coston-explorer.flare.network/address/0xd1Fa33f1b591866dEaB5cF25764Ee95F24B1bE64)
- [On Coston2](https://coston2-explorer.flare.network/address/0xd1Fa33f1b591866dEaB5cF25764Ee95F24B1bE64)

Next: [Message Integrity](./message-integrity.md)

[Back to Home](../README.md)

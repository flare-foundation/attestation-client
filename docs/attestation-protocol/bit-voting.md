# BitVoting

BitVoting is a technique used to resolve an ambiguous attestation situation.

Because the availability of data may be different from a specific data source, it can happen at any given time that not all data providers can confirm certain transactions or facts. For example, a transaction may be in a recent block, which is visible to some of the attestation providers but not yet with others. Also, attestation providers use indexers of blockchain data, which may have a limited history and the transaction may be too old to be within the indexing window. So some attestation providers can confirm it, but others cannot.

Since 50%+ of attesters have to submit the same Merkle root in order to be confirmed, at least that number of votes must be identical on all requests. Such unclear-cut decision requests can disrupt the attestation process, resulting in several different non-majority Merkle roots being submitted. For this situation, the [**choose** phase](./attestation-protocol.md#five-phases-of-a-round) is used to sync the attestation providers on what can be jointly confirmed.

After collecting attestation requests, each attester enumerates the requests in order of arrival (omitting duplicates) and queries for the existence of data needed for the attestation at relevant data sources (blockchain nodes, indexers, ...). Confirmed requests are indicated by a `1`  for "can validate" or a `0` for "cannot validate" They are stored into a bit array called `bitVote` that is sent to the `BitVoting` contract.

Attestation providers use:

```solidity
function submitVote(
   uint256 bufferNumber,
   bytes bitVote
   ) external
```

from the `BitVoting` contract to emit `bitVote` in the `choose` phase. The first byte of the bit vote indicates the intended voting round for which the bit vote is carried out. Its value must be `roundId % 256` to be considered a valid vote. If an attester submits several votes, the last vote sent before the deadline is considered valid.

Attesters can listen to the emitted bit-votes and use a deterministic algorithm to determine a subset of chosen requests such that enough attesters can get the data to decide on all of the requests in the subset. Then attestation providers only validate (include into the Merkle tree) the chosen requests.

Currently, `StateConnector` has a default set of 9 attestation providers. We need at least 5 to confirm a Merkle root. The calculation of the voting result proceeds as follows: Based on the fixed order of the attestation providers, we enumerate all of the 5-subsets<!--Whagt's a 5-subset?--> of the default set of 9. For each 5-subset, we calculate the joint intersection of votes and count the number of ones. The voting result is the intersection of the 5-subset<!--s?--> that has the most number of ones <!--Wat?-->. If more 5-subsets produce the same number of ones, the first according to the enumeration defines the result. The algorithm is used by each attestation provider separately. An attestation provider should either assemble the Merkle tree that includes exactly the (hashes of) attestations for the chosen requests, reject the proposed Merkle root with the valid zero (`0x000...000`) Merkle root, or abstain from voting (see [details](./voting-behavior.md)).

Note that 5 represents 50%+ of the default set. If the the chosen 5-subset would propose to confirm an invalid attestation while bit voting, this would imply that the majority of the default set is malicious or corrupted, which would require their replacement.

## BitVoting contract deployments

- https://songbird-explorer.flare.network/address/0xd1Fa33f1b591866dEaB5cF25764Ee95F24B1bE64
- https://flare-explorer.flare.network/address/0xd1Fa33f1b591866dEaB5cF25764Ee95F24B1bE64
- https://coston-explorer.flare.network/address/0xd1Fa33f1b591866dEaB5cF25764Ee95F24B1bE64
- https://coston2-explorer.flare.network/address/0xd1Fa33f1b591866dEaB5cF25764Ee95F24B1bE64

Next: [Message Integrity](./message-integrity.md)

[Back to Home](../README.md)

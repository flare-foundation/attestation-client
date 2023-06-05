# Bit Voting

Bit voting is a technique used to resolve an ambiguous attestation.

Because the availability of data from a specific data source may vary, it can happen that not all data providers can confirm certain transactions or facts at any given time. For example, a transaction may be in a recent block, which is visible to some of the attestation providers but not yet to others. Also, the indexers of blockchain data that attestation providers use may have a limited history so that a transaction may be too old to be within the indexing window. The result is that some attestation providers can confirm it, but others cannot.

Since 50%+ of attesters have to submit the same Merkle root in order for it to be confirmed, at least that number of votes must be identical on all requests. Ambiguous decision requests can therefore disrupt the attestation process, resulting in several different non-majority Merkle roots being submitted. To sync the attestation providers on what can be jointly confirmed, the [**choose** phase](./attestation-protocol.md#five-phases-of-a-round) of the attestation protocol is used. It is called bit voting, because all attestation providers vote on how they want to attest for each received request, using one bit for each vote.

Here's how the choose phase works for bit voting: After collecting attestation requests, each attester enumerates the requests in order of arrival (omitting duplicates) and queries for the existence of data needed for the attestation at relevant data sources (blockchain nodes, indexers,...). Confirmed requests are indicated by a `1`  for _can validate_ or a `0` for _cannot validate_. They are stored into a bit array called `bitVote`, which is sent to the `BitVoting` contract.<!--What is the order of operations between these paragraphs?-->

Attestation providers use the following function to emit<!--submit?--> a `bitVote` to the `BitVoting` contract in the `choose` phase:

```solidity
function submitVote(
   uint256 bufferNumber,
   bytes bitVote
   ) external
```

The first byte of the bit vote indicates the intended voting round for which the bit vote is carried out. Its value must be `roundId % 256` to be considered a valid vote. If an attester submits several votes, the last vote sent before the deadline is considered valid.

Attesters can listen to the emitted bit votes and use a deterministic algorithm to determine a subset of chosen requests such that enough attesters can get the data to decide on all of the requests in the subset. Then attestation providers only validate (include into the Merkle tree) the chosen requests.

Currently, `StateConnector` has a default set of 9 attestation providers. We need at least 5 to confirm a Merkle root. The calculation of the voting result proceeds as follows: Based on the fixed order of the attestation providers, all 5 in the subset<!--What is a "5-subset"? A subset of 5? Does it mean 1 subset containing 5 bits or 5 subsets containing ...what?--> of the default set of 9 are enumerated. For each of the 5 in the subset, the joint intersection of votes are calculated and the number of `1`s are counted. The voting result is the intersection of the 5 in the subset that have the most number of `1`s. If more than 5 produce the same number of `1`s, then the first one in the fixed order defines the result. The algorithm is used by each attestation provider separately. An attestation provider should either:

* Assemble the Merkle tree that includes the exact hashes of attestations for the chosen requests,
* Reject the proposed Merkle root with a valid zero (`0x000...000`), or
* Abstain from voting.

See [Voting Behavior of Attestation Providers](./voting-behavior.md).

Note that 5 attestation providers represent 50%+ of the default set. If the the chosen subset of 5 proposes to confirm an invalid attestation<!--How do we know its invalid if more than 5 want to confirm it? Aren't they the ones confirming the validity? Or is the validation process different from the attestation process? I don't think so. See the use of validate above.--> while bit voting, it implies that the majority of the default set is malicious or corrupted, which would require their replacement.

## BitVoting Contract Deployments in the Block Explorer

* [On Songbird](https://songbird-explorer.flare.network/address/0xd1Fa33f1b591866dEaB5cF25764Ee95F24B1bE64)
* [On FLare](https://flare-explorer.flare.network/address/0xd1Fa33f1b591866dEaB5cF25764Ee95F24B1bE64)
* [On Coston](https://coston-explorer.flare.network/address/0xd1Fa33f1b591866dEaB5cF25764Ee95F24B1bE64)
* [On Coston2](https://coston2-explorer.flare.network/address/0xd1Fa33f1b591866dEaB5cF25764Ee95F24B1bE64)

Next: [Message Integrity](./message-integrity.md)

[Back to Home](../README.md)

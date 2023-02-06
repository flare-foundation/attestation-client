## BitVoting contract

Due to possible different availability of data for a specific source (blockchain) it can happen at a given time that not all data providers can confirm certain transaction or a fact on the other chain. For example, a transaction may be in a recent block, which is visible at some of the attestation providers but yet not with some others. Also, attestation providers use indexers of blockchain data, which may have only a limited history and the transaction may be already to old to be within the indexing window. So some attestation providers can confirm it, but others cannot. 

Since 50% of attesters have to submit the same Merkle root in order to be confirmed, at least 50% of votes have to vote identically on all requests. Few such non-clear-cut decision requests can disrupt the attestation process yielding serveral different non-majority Merkle roots submitted. For that the **choose** phase is used to sync the default set on what can be jointly confirmed.
After collecting attestation requests each attestation enumerates the requests in order of arrival (omitting the duplicates) and queries for the existence of data needed for the attestation at relevant data sources (blockchain nodes, indexers, ...). Confirmed (attested) requests indicated with `1` (data is available), `0` (data is not available) and stored in a bit array called `bitVote` that is sent to the `BitVoting` contract.

Attestation providers use

```solidity
function submitVote(
   uint256 bufferNumber,
   bytes bitVote
   ) external
```

from `BitVoting` contract to emit `bitVote` in the `choose` phase.

Attesters can listen to emitted bit-votes and use a deterministic algorithm to determine a subset of chosen requests such that enough attesters can get the data to decide on all of the requests in the subset. Then attestation providers only validate (include into the Merkle tree) the chosen requests.

Currently, `StateConnector` has a default set of 9 attestation providers. We need at least 5 to confirm a Merkle root. Ideally, we could take all bit-votes of the 9 members of the default set and calculate the joint `AND`, in order to determine what is common intersection of attestations that they can confirm. Such a procedure could be very sensitive on occasional disruption of attestation providers, yielding a failed round, even if more than 5 attestatin providers from the default set could be able to some Merkle tree for certain subset of requests (attestations). To increase robustness of the algorithm we proceed as follows. We enumerate all the 7-subsets of the default set. For each 7-subset we calculate the joint intersection and calculate the number of ones. The first enumerated 7-subset that has the maximal number of ones defines the voting result. In case the maximal number of ones is 0, the procedure is repeated on 6-subsets, and if here we get 0 ones in all the intersections, we proceed with 5-subsets. If even here no intersection with ones is found, the vote is non-conclusive. In other cases there the deterministic algorithm described above returns the a non-zero bit-mask indicating which requests should be put into the Merkle tree. The algorithm is used by each attestation provider separately. An attestation provider should either assemble the Merkle tree which includes exactly the attestations for requests as discribed by the choose voting result bit-mask or vote with zero (`0x000...000`) Merkle root or abstain with voting. 

## Message integrity checks

While bit voting in choose phase ensures agreement on which attestation should be put in the Merkle tree, there is no insurance that all attestation providers will be able to build the same Merkle tree and thus obtain the same Merkle root to vote with. Namely, attestation providers could (usually due to a bug in code) have issues with consistency of the data obtained from the data source or issues of calculating the has of the relevant data, before putting it into the Merkle tree. For that reason, each attestation request contains the **message integrity code**. This is the hash of the attestation response and the string `"Flare"`. Each (non-malicious) requester should already know, what the attestation response should be - they are just requesting the Attestation protocol to confirm the data in a decentralized and secure way (by voting of attestation providers). Hence they provide the message integrity check. Upon making the query to the data source, the attestation provider appends to its own response the string `"Flare"` and calculates the hash. Only if this hash matches the message integrity code provided in the attestation request, the attestation response is considered valid and can be considerd for inclusion into the Merkle tree. Bit voting in combination of message integrity codes make the attestation protocol much more robust to attacks that could arise from misbehaviour of a subset of attetstation providers or bugs in attestation code.

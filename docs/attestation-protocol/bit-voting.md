## BitVoting contract

Due to the uncertainties at the tip of the chain and possible delay on certain nodes, some attestation providers may not be able to verify the request even though the request is valid.
Since 50% of attesters have to submit the same Merkle root in order to be confirmed, at least 50% of votes have to vote identically on all requests. Few such non-clear-cut decision requests can disrupt the attestation process.
We provide an auxiliary contract that helps attesters reach consensus on to communally avoid such request.

After collecting attestation request each attestation provider sorts the request and queries the existence of data needed for the attestation. Findings are indicated with `1` (data is available), `0` (data is not available) and stored in a bit array called `bitVote` that is sent to the `BitVoting` contract.

Attestation provider use

```solidity
function submitVote(
   uint256 bufferNumber,
   bytes bitVote
   ) external
```

from `BitVoting` contract to emit `bitVote` in `choose` phase that coincides with the first 45s of the `commit` phase.

Attesters can listen to emitted bitVotes and use an algorithm to determine a subset of chosen requests such that enough attesters can get the data to decide on all of the requests in the subset. Then attestation providers only validate chosen requests.

Currently, `StateConnector` has a default set of `9` attestation providers. The subset is determine in the following way: for each subset of `7` attestation providers, it crates a `combined choose list` that is `bitwise AND` of `choose lists` of attestation providers in the subset. Finally, the `combined choose list` with the largest number of `1`s is used as a list of chosen requests.

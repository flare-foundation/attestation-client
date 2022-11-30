# Synchronized query window

The main purpose of the indexer is to ensure that attestation providers will have the same view on the data that is being queried.
In particular, this means that for each query the attestation providers make for a specific attestation request in a given attestation round `roundId`, they will all agree on a query range defined by the `lowest_timestamp` and the `highest_block`. These values are prescribed in the attestation protocol and all attestation providers will either ensure that queries were carried out subject to these limitations, or they will abstain from sending attestations.

## Lower query window boundary

For each attestation round `roundId` a timestamp of the start of its `collect` phase is a well-defined value that can be calculated from the parameters on `StateConnector` contract, specifically `BUFFER_TIMESTAMP_OFFSET`  and `BUFFER_WINDOW`, as:

``` text
startTime(roundId) = BUFFER_TIMESTAMP_OFFSET + roundId * BUFFER_WINDOW,
```

Where all units are seconds. Given a query window duration `queryWindowInSec`, we get:

``` text
startQueryTime(roundId) = startTime(roundId) - queryWindowInSec
```

Each block in any blockchain has a unique timestamp. Note that block timestamps may differ a lot from the real time of the block production. For example, in a slow block production blockchain like Bitcoin, timestamp may differ from the real time even for up to 2 hours. In addition, timestamps for blocks are not necessarily monotonically non-decreasing, like it is the case with Bitcoin. Specifically with Bitcoin, we can take instead of the block timestamp the value of `mediantime`, which is the median time of the last 11 blocks and it is monotonically non-decreasing. The current choice for the indexer system is that the `mediantime` is used as the timestamp in the indexer for the blockchains that base on the Bitcoin code.
Hence, the lower bound for queries is well-defined in terms of a timestamp: all transactions in blocks with the indexed timestamp greater than or equal to the calculated start time (based on `roundId` start time) are considered in queries. The role of indexer is just to ensure enough of history so that `indexingWindowSec > queryWindowInSec + MG`, where `MG` is some large enough margin.

## Upper query window boundary

Syncing the query time window on the upper bound requires a bit more sophisticated approach. The practical requirement would be to use all available data up to the present. Even if we decided to use a cut-off time `CT`, we would not be completely sure whether an indexer had indexed all the blocks with timestamps lower or equal to `CT`. Namely, there might be a block that we did not receive yet with the timestamp matching the query. Even if we decided to put the timestamp "early enough", we still have the issue of what is "early enough".

On the upper boundary we also have another issue. Namely, we should consider only confirmed transactions. What is a confirmed transaction depends on the block height as perceived by a particular indexer, which depends on a particular network node from which the indexer is reading data through API calls. For each chain we define `numberOfConfirmations`. Given a block `B` with the block number `B.blockNumber`, its **confirmation block** is any block with the block number equal to `B.blockNumber + numberOfConfirmations`.

It could happen that the indexers of different attestation providers have in the respective databases different confirmed block heights simply because some indexers are a bit behind in indexing and writing to the database. But even if indexers were extremely fast in detecting confirmations and storing confirmed transactions into the database, there may still be an issue with new confirmation blocks. Namely, it could happen that a confirmation block is very fresh and it is just being distributed throughout the network during the query time. Hence, some attestation providers may sense this confirmation block while others may not, at their respective times of making verification queries. This will return different results and attestations. These cases show us that deciding what is the currently confirmed block height in some blockchains is in essence not a clear-cut decision, such that 100% of indexers would agree on at their respective times of making their queries.

This situation gets aggravated in case there are several (like 1000s) attestation requests in a single round and there are only a few such that are not clear-cut decisions. In general, each non-clear-cut confirmable request would cause that only like 50% of nodes on average would confirm the request. Assuming randomness of times when attestation providers sense a block with the next block number, only two such requests would cause that less than 50% of Merkle root attestation hashes would match. So the voting round would fail. Furthermore, if such a non-clear-cut decidable requests could be easily produced, one could use them to render attestation protocol non-operational (DOS attack), as the quorum could not be reached for several attestation rounds. Hence, it is of high importance to make the probability of producing such non-clear-cut decidable attestation requests so small, that it does not have averse effects on the attestation protocol.

The approach to address this requires both sides - the indexer and queries - to be properly adapted. Consequently, all attestation types should be designed in such a way, that they are clear-cut decidable.

The timings proposed below all assume 90s voting round windows are used.
On the indexer side we can take care of the following things:

- The indexer should be checking the blockchain node for new confirmation blocks aggressively (e.g. every second).
- The indexer should store the transactions from the confirmed blocks as fast as possible and in a single atomic database transaction.

On the querying side we take the following approach. A _confirmation block_ is a block that confirms certain past block. For example, if `numberOfConfirmations` for Bitcoin is 6, this means there must exist 5 more blocks and a block on height `blockNumber + 5` (in general `blockNumber + numberOfConfirmation - 1`) is called a _confirmation block_ for height `blockNumber`.
When querying, the mandatory input into the query is the hash of the confirmation block for the query window upper boundary block. We indicate the hash as the `upperBoundProof`. Given the `upperBoundProof`, a block with this hash is first determined from the block table in the database. Let `H` be the height of this block, then the upper query boundary is defined by `H - numberOfConfirmations + 1`. Surely, blocks of such height are confirmed.

Following the discussion above, two things that prevent us from getting the synchronized upper window query boundary can happen while querying an indexer:

- A block with the hash `upperBoundProof` does not exist in the database.
- A block with the hash `upperBoundProof` exists in the database, but database does not contain all the confirmed blocks, in particular the ones at the height `H - numberOfConfirmations + 1`.

The latter case clearly implies that our indexer is too slow, and we need to wait a bit more before making a query. If it takes too long, we must abstain from voting in the current voting round.
On the other hand, the former case may be further divided into two cases:

- A block with the hash `upperBoundProof` has not yet arrived to our blockchain node, so the indexer has not read it yet. We should wait a bit more.
- There is no block with the hash `upperBoundProof`. We should reject the attestation that triggered the query.

The main idea for reaching a synchronized upper boundary is the following. If an attestation request is valid (can be confirmed), then the confirmation block with the hash `upperBoundProof` must exist, such a block has been mined and the proposer must have seen it. Except in the case of "selfish mining" as described below, such a block is either being distributed or has been already distributed throughout the blockchain peer nodes. Hence, an attestation provider should just wait for say 30s from the end of the `collect` phase in which the associated request was sent, and it should receive it with very high probability. So the correct behavior that always works with high probability is: if you already have the block with the hash `upperBoundProof`, you are safe to make a query and proceed with other checks for confirming/rejecting the attestation request. On the other hand, if you do not have such a block, wait 30s and then retry. In case the provided `upperBoundProof` is wrong, nobody will find a block with such a hash in the database, hence everybody will reject the attestation request due to a wrong `upperBoundProof`.

There is a case of a so called "selfish mining", where a miner keeps block for himself to mine the next block and then sends it to others later, gaining some edge over others, but also possibly risking of losing the advantage, since miners may start mining on other blocks of the same height. In this case, one could use the delayed blocks to attack the attestation system by carefully timed sending, thus introducing non-clear-cut decision requests. Near the top of the chain such a scenario is highly improbable and hard to produce, even for a single case, but basically impossible to repeat consistently, unless on a blockchain is undergoing 50%+ attack. But if we would accept `upperBoundProof` on any fork on any depth that implies 6 confirmations (e.g. for Bitcoin) of some block, this allows for two types of attacks:
- Some nodes may delete very old forks so it is unclear whether a particular node would see it or not.
- Malicious attackers could decide to mine a fork deep in the chain. To mine such forks miners have a lot of time, much more than 10 min average for competing with top chain blocks (in case of Bitcoin). The attacker could mine in a longer time several such forks in the past and then use them to disrupt the system for several rounds in a sequence, just by sending the blocks into the networks at inconvenient times while simultaneously sending requests with `upperBoundProofs` hashes of those blocks.

Hence it is crucial to somehow limit the ability to use old forks. For that have implemented the following mechanism:
- For each chain we have added an additional parameter `UBPUnconfirmedWindowInSec`.
- For each `roundId` we take the start time `start(roundId)` timestamp on Flare. 
- We calculate `cutoffTime(roundId) = start(roundId) - UBPUnconfirmedWindowInSec`. This value is the same for every attestation provider.
- If the timestamp of the block with the hash `upperBoundProof` is greater or equal `cutoffTime(roundId)`, then it can be used as a valid `upperBoundProof`. That means that it can be on any fork.
- If the timestamp of the block with hash `upperBoundProof` is strictly smaller than the `cutoffTime(roundId)`, then the `upperBoundProof` is valid only if it is on one of the longest forks.

### Bitcoin upper bound proof settings

In particular this means that if we set `UBPUnconfirmedWindowInSec` to 3.5 hours on Bitcoin we can be pretty sure that `upperBoundProof` is valid only if the block is already confirmed. Setting `UBPUnconfirmedWindowInSec` even higher makes this probability even higher while setting it lower reduces this probability. For example, if we for the purpose of discussion for a moment omit 2h variability of timestamp with Bitcoin and we set `UBPUnconfirmedWindowInSec` to 40 minutes, then we could have several choices for `upperBoundProof` right below the cutoff time only if there were competing forks of length 5, which is rare. But due to high variability of timestamp on Bitcoin, 3.5 hours seems surely enough with 2h variability and 1.5 hours for confirmations (with 0.5 hours buffer). Based on further analysis of historical data this could be lowered. Namely the higher value of `UBPUnconfirmedWindowInSec`, more time attackers have for mining old forks which can be used for attacks as described above. 

Our estimation of risks for the 3.5h window on Bitcoin is as follows. We know that 100% of hash power on the Bitcoin network produces on average 1 block in 10 minutes. Given 3.5 hours (on average 21 blocks), then 100/21 ~ 5% of total hash power could be used to produce one fork block in 3.5 hours. So with 5% of the total hash rate we could disrupt one of 140 rounds that happen in 3.5 hours. With 50% of hash rate one could disrupt every 14th round. Note also that it is not easy to exactly time the Selfish miner attack and in general one would need to send 2 blocks to ensure that no set of distinct Merkle tree voters has 50%. Just for Bitcoin in isolation and the effort required to be used for attacking instead for mining on Bitcoin and possibly getting rewards, makes this attack of very low probability and rather low impact (sporadic round fails).
Note also that we support three proof of work chains (BTC, LTC, DOGE) which can be all used simultaneously for similar attacks implying that the probabilities add as we add more chains. At the momemnt, we do not plan to add any PoW chain soon.

## Two step query 

The proper query procedure can be thus summarized in terms of a 2-step procedure.

### The first step (initial query)

- Read the block with the hash `upperBoundProof` from the database.
- If such a block does not exist, delay the query to the second step (finish this step).
- Otherwise, let `H` be the block number (height) for the block with the hash `upperBoundProof`. Let `U = H - numberOfConfirmations + 1`.
- Read the last confirmed block number `N` in the indexer.
- If `N >= U`, then proceed with the query and the upper boundary `U`.
- Otherwise, `U` should have been the confirmed height, but since `N < U`, the indexer is lagging. Delay the query to the second step.

### The second step (delayed query)

- The query in this step is made after the half of the `commit` phase of the attestation round in which a request is processed. This should be at least 45s after the end of the `collect` phase, when the last attestation request was submitted for this round. The time of 45s should be enough time for other indexers to receive blocks that existed up to the end of the `collect` phase of the current attestation round.
- Read the block with the hash `upperBoundProof` from the database.
- If such a block does not exist, we first verify, if our aggressive reading of blocks works well. Indexer is trying to read new top blocks aggressively, and every time it makes a check, it stores a timestamp into the database.
  - If the "last read" timestamp is too old (like more than 10s), then something is wrong with our indexer. We should completely abstain from voting in this round.
  - Otherwise, everything is ok with the indexer and we can be sure with very high probability, that a block with the hash `upperBoundProof` does not exist, the attestation request is invalid.
- Otherwise, such a block exists. Let `H` be the block number (height) for the block with the hash `upperBoundProof`. Let `U = H - numberOfConfirmations + 1`.
- Read the last confirmed block number `N` in the indexer.
- If `N >= U`, then proceed with the query and the upper boundary `U`.
- Otherwise, `U` should have been confirmed height, but since `N < U`, the indexer is lagging. Since we do not have more time to delay, we clearly have problems with our indexer and we should completely abstain from voting in this round.

Next: [Optimizations](./indexer-optimizations.md)

[Back to Home](../README.md)

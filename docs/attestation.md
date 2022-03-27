## Attestation protocol

Atestation protocol is a protocol in which facts from other (external) chains, or data sources in general, are proposed for attestation by users, and then the set of default attestation providers vote on them by casting their votes in the form of attestations.

For example, in a simplified setting, a user proposes to the protocol a fact to be confirmed, that the transaction with the transaction id `XYZ` exists in Ripple network. Given such an _attestation request_, each attestation provider will first fetch the data about the transaction from the Ripple network. It will extract from the transaction the information like transaction id, block number, block timestamp, source address, destination address, transfered amount, payment reference, etc. The data used are collectively called _attestation data_. A 32-byte hash will be produced using the attestation data, serving as the _attestation hash_, or shortly _attestation_. Such an attestation will be submitted to the protocol. Several attestation providers will do the same in parallel and submit their attestations. The protocol will collect the submitted attestations and if majority of the attestations are the same, the protocol will confirm the majority attestation hash, yielding the _confirmed attestation hash_ (or _confirmed attestation_).

Then if any user would provide attestation data, say to some contract, such a contract can calculate the hash of the attestation data and compare it to the confirmed attestation hash. In case of a match, the contract has the confirmation that the provided attestation data is valid and it can act upon that.

In our example, the transaction with the transaction id `XYZ` in Ripple network could be a payment for some service regulated by a contract on Flare network, for which one needs to pay 100 XRP to a specific Ripple address. A user would first request the contract for the service. The contract would issue a requirement to pay 100 XRP to a specific address given a specific payment reference. The user would then carry out the payment in Ripple network, producing the payment transaction with the transaction id `XYZ`. Then it would then request the attestation protocol to attest for the transaction which would trigger the procedure described above. Once the confirmed attestation hash is obtained by the protocol, the user would submit the attestation data for transaction `XYZ` to the contract. Contract would hash the attestation data with its requirements (e.g. 100 XRP, required receiving address, correct timing, correct payment reference, etc.). Then it would calculate the hash of the provided attestation data and compared it to the confirmed attestation hash obtained by the attestation protocol. If everything matches, the contract has the proof that the payment was correct and it can unlock the service for the user.

A simplified version of the attestation protocol described above implies that an efficient implementation of the protocol should be organized as a sequence of voting rounds, where in each voting round, attestation providers vote not just on a single fact, but on a package of facts. Here we see a clear analogy with the classic part of each blockchain consensus algorithm, where validators try to reach the consensus for the next proposed block. Thus multiple facts can be collected together and put for a vote in a given voting round. Attestation hashes of each verified fact can be assembled using a Merkle tree into a single hash (Merkle root) which is submitted by each attestation provider for the voting round. Proving a specific attestation would in this case require combination of the confirmed attestation hash (Merkle root) and the specific Merkle proof, obtained for a specific attestation request.

A secure implementation of the protocol should also take care of preventing copying the casted votes (attestations), in a similar manner as elections are organized. In particular, this forces attestation providers to cast genuine attestations, obtained by actually checking the data on other chains. Hence a commit-reveal scheme should be applied.

The implemented attestation protocol consists of a sequence of rounds. Each round starts every 90s and its sequential index is its round id. A round starts at a certain time and after that it evolves through the following four phases, each lasting 90s:

- `collect` - the first 90 seconds. Attestation requests are being collected.
- `commit` - the next 90 seconds. Attestation providers are carrying out verifications, calculating attestations and submitting masked commit hashes of their votes before the end of this phase. Each attestation provider calculates Merkle root for the attestations of the round. Requests that cannot be verified (like non-existent transaction id) are omitted (no attestation hash is produced). Also each attestation providers chooses a big random number which it keeps hiden in this phase. Then it calculates XOR of the Merkle root and the random number, obtaining _masked attestation_. Attestation providers submit masked attestations, which act as commiting to the vote.
- `reveal` - the next 90 seconds. Attestation providers are revealing their votes. They are disclosing their random number by sending them to the protocol.
- `count` - starts immediately after the end of the reveal phase. Combining each masked attestation with the corresponding revealed random attestations (Merkle roots) of all attestation providers are obtained. The protocol finds the majority of the same hashes and declares this the confirmed attestation. Majority is at the moment set as 50%+ of all possible votes (the set of all attestation providers is known in advance). In case the there is no majority attesttion, the voting round has failed and no attestation request from that round gets confirmed. Users can resubmit requests in later rounds.

## State connector contract

To facilitate the attestation protocol the `StateConnector` contract is used. This is basically the voting contract, that does the following.

- Manages voting rounds.
- accepts attestation requests all the time. Based on the time of submission each attestation request is mapped to the relevant `collect` phase of the corresponding voting round.
- Accepts commit and reveal submissions by attestation providers, mapping them to the `commit` and `reveal` phases of the relevant voting rounds.
- Counts the votes (attestations) and declares winner attestation for every voting round (in `count` phase).

Note that voting rounds are interlaced. For example, if $T_0$, $T_1$, ... are sequential 90s intervals, then the voting round with id 0 has `collect` phase in $T_0$, `commit` phase in $T_1$, etc. Simultaneously, voting round with id 1 has the `collect` phase in $T_1$, `commit` phase in $T_2$, etc.

Due to the central involvement of the `StateConnector` contract in the attestation protocol, the protocol is also often called the _Stateconnector protocol_.

### Requesting attestations

Attestation request is send as a byte string, that encodes the request, according to the rules stated below. This byte string is sent to `StateConnector` contract using the following function:

```
function requestAttestations(bytes calldata data) external;
```

This is a very simple function - all it does is that emits the event of the form below, that includes `block.timestamp` and re-emits the submitted data.

```
event AttestationRequest(
   uint256 timestamp,
   bytes data
);
```

The data in the request is not stored on blockchain.

### Providing attestations

Attestation provider listen for the emitted `AttestationRequest` events. They collect all the requests for one voting round, parese them and figure out what kind of verifications they need to carry out. For each successfuly validate request attestation hash is calculated. All the attestation hashes for the round are collected into Merkle tree and Merkle root for the round is calculated.

Attestation provider uses a single function for submitting and revealing its vote:

```
function submitAttestation(
   uint256 bufferNumber,
   bytes32 maskedMerkleHash,
   bytes32 committedRandom,
   bytes32 revealedRandom
) external returns (
   bool _isInitialBufferSlot
)
```

This function is called once per attestation round, usually near the end of it. Note that by calling the function one simultaniously sends commit data for one voting round (`maskedMerkleHash` and `committedRandom`) and reveal data for the previous voting round (`revealedRandom`).

`StateConnector` smart contrat operates with sequential 90s windows (`BUFFER_WINDOW = 90`). Here `bufferNumber` indicates the index of the particular window. Given a timestamp `T` one can calculate the corresponding `bufferNumber` with `T` contained in it as follows:

```
bufferNumber(T) = (T - BUFFER_TIMESTAMP_OFFSET)/BUFFER_WINDOW
```

The caller of the function `submitAttestation` must call it with `bufferNumber` corresponding to the time of the call, otherwise the call is rejected.

The relation between voting round id and `bufferNumber` is defined as follows. The first voting round (`roundId = 0`) starts its `collect` phase in window with `bufferNumber = 0`. Hence `bufferNumber` corresponds to the window of the `collect` phase of the voting round with the same index (`roundId`). Hence the `commit` phase of the round with a given `roundId` is in `bufferNumber` equal to `roundId + 1`, the `reveal` phase is in window with `bufferNumber` equal to `roundId + 2` and the `count` phase is in the window with `bufferNumber` equal to `roundId + 3`.

Accordingly, calling `submitAttestation` in a given `bufferNumber` implies we are sending commit data for `roundId` equal `bufferNumber - 1` and reveal data for `roundId` equal `bufferNumber - 2`.

## Songbird and Coston deployments

The currently deployed `StateConnector` contracts on Songbird and Coston networks are available here:

- https://songbird-explorer.flare.network/address/0x3A1b3220527aBA427d1e13e4b4c48c31460B4d91/transactions
- https://coston-explorer.flare.network/address/0x947c76694491d3fD67a73688003c4d36C8780A97/transactions

Both contracts have as the start timestamp set the unix epoch `BUFFER_TIMESTAMP_OFFSET = 1636070400` (November 5th, 2021) and `BUFFER_WINDOW = 90`.

## Attestation types

Attestation providers provide attestations only for specific types of requests. These types are called _attestation types_ and have to be designed in such a way that that they are clear-cut decidable. Clear-cut decidability includes the requirement of having a synchronized view on data from external data sources (e.g. other chains) that are used for data attestations. For example, in slower block producing blockchains like Bitcoin, one attestation provider may see a certain block at the moment of query while the other may not see it yet, as the block might not have been fully distributed throughout the network. Such providers would yield completely different attestations. Hence special data view synchronization protocols have to be applied.

Sinchronized data views are also important due to representation of the submitted vote by the Merkle root of all attestations in the voting round. In case of non-syncronized data views, data providers would often vote differently on the most recent attestation requests (depending on the time of query), which would yield completely different Merkle roots and thus cripple the voting round, as achieving at least 50% of all submitted Merkle roots would become extremely difficult. Attestation types and mechanisms to achieve dadta view synchronization will be described later.

## Merkle tree

Attestations for each voting round (data hashes of the atttested data) are assembled into the Merkle tree and only the Merkle root is used in voting. The Merkle root that is sent by majority of attestation providers becomes confirmed Merkle root for the round and it is stored in the `StateConnector` contract. As of current implementation, the confirmed Merkle root is in accessible by calling looking up into the public array on contract `merkleRoots` which is a cyclic buffer of length `TOTAL_STORED_PROOFS` (6720 - a week of proofs). Note also that the proof for a given voting round is stored at the index `(roundId + 2) % 6720`.

For a specific voting round it suffices for proving verification to know whether an attestation hash of a specific transaction has appeared (or equivalently was confirmed) in the voting round.
For that purpose, attestion providers (voters) organise submitted attestation hashes in a round as follows.

- They collect all the voting requests for a specific round and try to verify them.
- For the verified ones, the attestation hashes are calculated. There are no hashes produced for the requests that cannot be verified.
- All verified attestation hashes are put in the list and sorted (numerically, ascending order). Duplicates are removed.
- Merkle tree is calculated on those hashes according to the definition below.

### Merkle tree structure

The Merkle tree on $n$ sorted hashes is represented by an array of length $2n - 1$ which represents the complete binary tree. A complete binary tree is a binary tree in which all the levels are completely filled except possibly the lowest one, which is filled from the left.

It can be easily be proven by induction that a complete binary tree with $2n - 1$ elements has exactly $n$ leaves and all nodes are either leaves or have two descendants (left and right). For $n = 1$ we have a tree with only one element, root an leaf simultaneously. If we add two descendants to a single element tree, we get a tree with 2 leaves but $3 = 2 2 - 1$ elements. If we add two descendants to the leftmost leaf, we change a leaf to an internal node (efectively removing one list), but add two more leafs. In general step we thus have a complete binary tree that has all levels filled except the last one. If we enumerate nodes from 0 starting with the root and proceeding through levels from left on right, we take the node with the first index, such that it is a leaf and expand it with two leafs. We again get a complete binary tree with 2 more nodes and 1 more leaf.

The above mentioned indexing enables us to represent a Merkle tree with $n$ leaves in an array of length exactly $2n - 1$, where the last $n$ elements are the leaves. This representation of a complete binary tree is well known from classic implementation of binary heaps. It encodes the tree structure as follows:

- merkle root is at index $0$,
- leaves are on the last $n$ indices, hence from $n - 1$ to $2n - 2$.
- given an index $i$ of a node in the tree, we can get parent both descendants as follows:
  $$
  {\rm parent}(i) = \left\lfloor \frac{i - 1}{2}\right\rfloor,
  $$
  $$
  {\rm left}(i) = 2 i + 1, \qquad {\rm if }\; 2i + 1 < 2n - 1,
  $$
  $$
  {\rm right}(i) = 2 i + 2, \qquad {\rm if }\; 2i + 2 < 2n - 1.
  $$

Since we have a complete binary tree, we can easily calculate a sibiling node of the node with index $i$

$$
{\rm sibiling}(k) = \left\{
\begin{array}{ll}
k - 1 & {\rm if}\; k {\rm \; even},\\
k + 1 & {\rm if}\; k {\rm \; odd}.
\end{array}
\right.
$$

Note that there are several types of Merkle trees depending on a purpose of use. In general a Merkle tree can be used to uniquely produce a representative hash for a _fixed sequence_ of hashes or just for a _set_ of hashes (order of appearance is not important).

For example, with Merkle trees for transactions in a block on Bitcoin the exact order of transactions in the block are important, hence we use _fixed sequence_ Merkle tree. In our case the order of votes is not important and we use _set_ Merkle tree. Namely, each successful vote is identified with the unique hash. For later verification, one only needs to query whether such a hash has appeared among hashes in the Merkle tree. On the other hand, in the Bitcoin transactions example, one needs to verify that the hash of a transaction is a leaf of the tree on the specific index.

In case of set Merkle trees, additional simplification when performing hashes of pairs can be used. Such a simplification makes Merkle proofs shorter and easier. The hash we use for pairs is defined as follows. Let ${\rm hash(data)} be a hash function which given a byte string $data$ produces 32-byte hash, let ${\rm sort}(list)$ be the sorting function for a list of byte strings and let ${\rm join}(list)$ be the function that concatenates byte strings to as single byte string in order of appearance. Define

$$
{\rm shash}(data_1, data_2) = {\rm hash({\rm join}({\rm sort}([data_1, data_2])))}
$$

This function will be used for producing pair hashes while building the tree. Basically that means that given two hashes they are first sorted, than joined and then a hash is produced.

-

### Building a Merkle tree

Assume attestation provider has performed all necessary verifications and for the confirmed request got $m$ attestation hashes. Some requests may be duplicate, yielding duplicate verification hashes, and thus those can be safely removed. Hence we can assume that the attestation privider has $n$ uniques attestaion hashes. To build the Merkle tree, the attestation providers proceeds as follows:

- $n$ hashes are sorted in the ascending order. Note that the order is unique.
- Array $M$ with $2n - 1$ elements is allocated.
- $n$ hashes are put into the slots from $n - 1$ to $2n - 2$, hence $M_{n-1},\dots, M_{2n -2}$.
- for $i = n - 2$ down to 0 calculate $M[i] = {\rm Shash}(M_{{\rm left}(i)}, M_{{\rm right}(i)})$

### Building a Merkle proof

A Merkle proof for a leaf is the shortest sequence of hashes in the Merkle tree on a path to the Merkle root that enables the calculation of a Merkle root from the leaf. Let $M$ be an array representing a Merkle tree on $n$ leaves with $2n - 1$ nodes defined as above. Note that the attestation hashes appear on indices $n-1$ to $2n -2$ and are sorted. Hence the $k$-th hash appears on the index $n-1 + k$. The Merkle proof for $k$-th hash can be calculated by using the following recursive formulas
$$
{\rm next_k}(sequence)=  \left\{
\begin{array}{ll}
[{\rm sibling}(n - 1 + k)]  & {\rm if}\; sequence = [\;], \\
[\ldots, j, {\rm sibling}({\rm parent}(j))] & {\rm if}\; sequence = [\ldots, j]\; {\rm and}\; {\rm parent}(j) \neq M_0,\\
sequence & {\rm otherwise}
\end{array}
\right.
$$

Starting with an empty sequence and repeatedly applying ${\rm next}_i(...)$ function until it stabilizes produces the Merkle proof for $k$-th attestation hash.

For checking a Merkle proof the following "standard" Open Zepplin library can be used:

https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/MerkleProof.sol

### Hashing function

Given two attestation hashes `a1` and `a2`, ${\rm Shash}(a1, a2)$ function used in Solidity is defined as follows:
```
keccak256(abi.encode(v1, v2)) 
```
where variables `v1` and `v2` are of type `bytes32`.

In _web3.js_ we the equivalent definition is:

```
web3.eth.abi.encodeParameters(["bytes32", "bytes32"], [a1, a2]);
```

where `a1` and `a2` are `0x` prefixed hex strings representing 32-bytes (total string length is 64, hence $2 \cdot 32 = 64$ for encoding bytes and 2 more for prefix `0x`).
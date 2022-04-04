## Merkle tree

Attestations for each voting round (data hashes of the atttested data) are assembled into the Merkle tree and only the Merkle root is used in voting. The Merkle root that is sent by majority of attestation providers becomes confirmed Merkle root for the round and it is stored in the `StateConnector` contract. As of current implementation, the confirmed Merkle root is in accessible by calling looking up into the public array on contract `merkleRoots` which is a cyclic buffer of length `TOTAL_STORED_PROOFS` (6720 - a week of proofs). Note also that the proof for a given voting round is stored at the index `(roundId + 2) % 6720`.

For a specific voting round it suffices for proving verification to know whether an attestation hash of a specific transaction has appeared (or equivalently was confirmed) in the voting round.
For that purpose, attestion providers (voters) organise submitted attestation hashes in a round as follows.

- They collect all the voting requests for a specific round and try to verify them.
- For the verified ones, the attestation hashes are calculated. There are no hashes produced for the requests that cannot be verified.
- All verified attestation hashes are put in the list and sorted (numerically, ascending order). Duplicates are removed.
- Merkle tree is calculated on those hashes according to the definition below.

### Merkle tree structure

The Merkle tree on _n_ sorted hashes is represented by an array of length _2n - 1_ which represents the complete binary tree. A complete binary tree is a binary tree in which all the levels are completely filled except possibly the lowest one, which is filled from the left.

It can be easily be proven by induction that a complete binary tree with _2n - 1_ elements has exactly _n_ leaves and all nodes are either leaves or have two descendants (left and right). For _n = 1_ we have a tree with only one element, root an leaf simultaneously. If we add two descendants to a single element tree, we get a tree with 2 leaves but _3 = 2 x 2 - 1_ elements. If we add two descendants to the leftmost leaf, we change a leaf to an internal node (efectively removing one list), but add two more leafs. In general step we thus have a complete binary tree that has all levels filled except the last one. If we enumerate nodes from 0 starting with the root and proceeding through levels from left on right, we take the node with the first index, such that it is a leaf and expand it with two leafs. We again get a complete binary tree with 2 more nodes and 1 more leaf.

The above mentioned indexing enables us to represent a Merkle tree with _n_ leaves in an array of length exactly _2n - 1_, where the last _n_ elements are the leaves. This representation of a complete binary tree is well known from classic implementation of binary heaps. It encodes the tree structure as follows:

- merkle root is at index _0_,
- leaves are on the last _n_ indices, hence from _n - 1_ to _2n - 2_.
- given an index _i_ of a node in the tree, we can get parent both descendants as follows:
```
parent(i) = floor((i - 1)/2)
left(i)   = 2*i + 1,      if 2*i + 1 < 2*n - 1
right(i)  = 2*i + 2,      if 2*i + 2 < 2*n - 1.
```

Since we have a complete binary tree, we can easily calculate a sibiling node of the node with index _i_

```
sibiling(k) = k + 2*(k % 2) - 1
```

Note that there are several types of Merkle trees depending on a purpose of use. In general a Merkle tree can be used to uniquely produce a representative hash for a _fixed sequence_ of hashes or just for a _set_ of hashes (order of appearance is not important).

For example, with Merkle trees for transactions in a block on Bitcoin the exact order of transactions in the block are important, hence we use _fixed sequence_ Merkle tree. In our case the order of votes is not important and we use _set_ Merkle tree. Namely, each successful vote is identified with the unique hash. For later verification, one only needs to query whether such a hash has appeared among hashes in the Merkle tree. On the other hand, in the Bitcoin transactions example, one needs to verify that the hash of a transaction is a leaf of the tree on the specific index.

In case of set Merkle trees, additional simplification when performing hashes of pairs can be used. Such a simplification makes Merkle proofs shorter and easier. The hash we use for pairs is defined as follows. Let `hash(data)` be a hash function which given a byte string `data` produces 32-byte hash, let `sort(list)` be the sorting function for a list of byte strings and let `join(list)` be the function that concatenates byte strings to as single byte string in order of appearance. Define

```
shash(data1, data2) = hash(joinlist(sort([data1, data2])))
```


This function will be used for producing pair hashes while building the tree. Basically that means that given two hashes they are first sorted, than joined and then a hash is produced.

### Building a Merkle tree

Assume attestation provider has performed all necessary verifications and for the confirmed request got _m_ attestation hashes. Some requests may be duplicate, yielding duplicate verification hashes, and thus those can be safely removed. Hence we can assume that the attestation privider has _n_ uniques attestaion hashes. To build the Merkle tree, the attestation providers proceeds as follows:

- _n_ hashes are sorted in the ascending order. Note that the order is unique.
- Array `M` with _2n - 1_ elements is allocated.
- _n_ hashes are put into the slots from _n - 1_ to _2n - 2_, hence `M[n-1], ..., M[2n - 2]`.
- for _i = n - 2_ down to 0 calculate `M[i] = Shash( M[left(i)], M[right(i)])`

### Building a Merkle proof

A Merkle proof for a leaf is the shortest sequence of hashes in the Merkle tree on a path to the Merkle root that enables the calculation of a Merkle root from the leaf. Let `M` be an array representing a Merkle tree on _n_ leaves with _2n - 1_ nodes defined as above. Note that the attestation hashes appear on indices _n-1_ to _2n - 2_ and are sorted. Hence the _k_-th hash appears on the index _n - 1 + k_. The Merkle proof for _k_-th hash can be calculated by using the following code:
```
getProof(k) {
   if (n == 0 || k < 0 || k >= n) {
      return null;
   }
   let proof = [];
   let pos = n - 1 + k;
   while (pos > 0) {
      proof.push(M[sibiling(pos)]);
      pos = this.parent(pos);
   }
   return proof;
}
```

For checking a Merkle proof the following "standard" [Open Zepplin library](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/MerkleProof.sol) can be used:

### Hashing function

Given two attestation hashes `a1` and `a2`, `Shash}(a1, a2)` function used in Solidity is defined as follows:
```
keccak256(abi.encode(v1, v2)) 
```
where variables `v1` and `v2` are of type `bytes32`.

In _web3.js_ we the equivalent definition is:

```
web3.eth.abi.encodeParameters(["bytes32", "bytes32"], [a1, a2]);
```

where `a1` and `a2` are `0x` prefixed hex strings representing 32-bytes (total string length is 64, hence _2 x 32 = 64_ for encoding bytes and 2 more for prefix `0x`).


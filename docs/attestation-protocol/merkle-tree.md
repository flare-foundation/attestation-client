# Merkle Tree

Attestations for each voting round (data hashes of the attested data) are assembled into a Merkle tree and only the Merkle root is used in voting. The Merkle root that is sent by the majority of attestation providers becomes the confirmed Merkle root for the round and it is stored in the `StateConnector` contract.

For proving verifications of a specific voting round, it suffices to know whether an attestation hash of a specific attestation request has appeared (or was equivalently confirmed) in the voting round.
For this purpose, attestation providers (voters) organize the submitted attestation hashes in a round as follows:

- They collect all the voting requests for a specific round and try to verify them.
- They exclude any requests that were not chosen in the [`choose` phase](./attestation-protocol.md#five-phases-of-a-round).
- The attestation hashes are calculated for the verified ones. No hashes are produced for the requests that cannot be verified.
- All verified attestation hashes are put in the list and sorted numerically, in ascending order, and duplicates are removed.
- The Merkle tree is built on those hashes as described below.

## Merkle Tree Structure

The Merkle tree on _n_ sorted hashes is represented by an array of length _2n - 1_, which represents the complete binary tree. A complete binary tree is a binary tree in which all the levels are completely filled except possibly the lowest one, which is filled from the left.

It can be easily proven by induction that a complete binary tree with _2n - 1_ elements has exactly _n_ leaves and all nodes are either leaves or have two descendants (left and right). For _n = 1_ there is a tree with only one element, the root and the leaf simultaneously. If two descendants are added to a single element tree, the result is a tree with 2 leaves but _3 = 2 x 2 - 1_ elements. If two descendants are added to the leftmost leaf, it is changed to an internal node, effectively removing one leaf and adding two more leaves. The result is a complete binary tree that has all levels filled except maybe the last one, which is filled from the left. If nodes are enumerated from 0 starting with the root and proceeding through levels from the left to the right, then, to add a leaf to the tree, the leaf node with the lowest index needs to be expanded with two leaves, resulting in a complete binary tree with 2 more leaves and 1 more internal node.

The above-mentioned indexing enables us to represent a Merkle tree with _n_ leaves in an array of length exactly _2n - 1_, where the last _n_ elements are the leaves. This representation of a complete binary tree is well known from classic implementation of binary heaps. It encodes the tree structure as follows:

- The Merkle root is at index _0_.
- Leaves are on the last _n_ indices, from _n - 1_ to _2n - 2_.
- Given an index _i_ of a node in the tree, the parent and both descendants are as follows:

  ```text
  parent(i) = floor((i - 1)/2)
  left(i)   = 2*i + 1,      if 2*i + 1 < 2*n - 1
  right(i)  = 2*i + 2,      if 2*i + 2 < 2*n - 1.
  ```

- Since it is a complete binary tree, a sibling of the node with index _i_ can easily be calculated with:

  ```text
  sibling(i) = i + 2*(i % 2) - 1
  ```

Note that there are several types of Merkle trees, depending on their purpose. In general, a Merkle tree can be used to uniquely produce a representative hash for a _fixed sequence_ of hashes or just for a _set_ of hashes, if the order of appearance is not important.

For example, with Merkle trees for transactions in a block on the Bitcoin network the exact order of the transactions in the block is important, hence we use a _fixed sequence_ Merkle tree. In our case the order of votes (attestation hashes) is not important so we use a _set_ Merkle tree. Namely, each successful vote is identified with the unique attestation hash (note that we remove the duplicates!). For later verification, one only needs to query whether such a hash has appeared among the hashes in the Merkle tree. On the other hand, in the Bitcoin transactions example, one needs to verify that the hash of a transaction is a leaf of the tree on the specific index.

In the case of a set of Merkle trees, additional simplification when performing hashes of pairs can be used. Such a simplification makes Merkle proofs shorter and easier to use. The hash we use for pairs is defined as follows: Let `hash(data)` be a hash function that, given a byte sequence `data`, produces a 32-byte hash. Let `sort(list)` be the sorting function for a list of byte strings and let `join(list)` be the function that concatenates byte strings to a single byte string in order of appearance. Define

```text
shash(data1, data2) = hash(join(sort([data1, data2])))
```

This function will be used for producing pair hashes while building the Merkle tree. Basically that means that given two hashes they are first sorted, then joined, and then a hash is produced.

## Building a Merkle Tree

Assume an attestation provider has performed all necessary verifications and obtained the necessary attestation hashes for the confirmed request _m_. Some requests may be duplicates, yielding duplicate verification hashes, and those can be safely removed. Hence, we can assume that the attestation provider has _n_ unique attestation hashes. To build the Merkle tree, the attestation providers proceed as follows:

- _n_ hashes are sorted in the ascending order. Note that the order is unique.
- An array `M` with _2n - 1_ elements is allocated.
- _n_ hashes are put into the slots from _n - 1_ to _2n - 2_, this is, `M[n-1], ..., M[2n - 2]`.
- for _i = n - 2_ down to 0, calculate `M[i] = shash( M[left(i)], M[right(i)])`

## Building a Merkle Proof

A Merkle proof for a leaf is the shortest sequence of hashes in the Merkle tree on a path to the Merkle root that enables the calculation of the Merkle root from the leaf. Let `M` be an array representing a Merkle tree on _n_ leaves with _2n - 1_ nodes defined as above. Note that the attestation hashes appear on indices _n-1_ to _2n - 2_ and are sorted. Hence the _k_-th hash appears on the index _n - 1 + k_. The Merkle proof for the _k_-th hash can be calculated by using the following pseudocode:

```text
getProof(k) {
   if (n == 0 || k < 0 || k >= n) {
      return null;
   }
   let proof = [];
   let pos = n - 1 + k;
   while (pos > 0) {
      proof.push(M[sibling(pos)]);
      pos = parent(pos);
   }
   return proof;
}
```

For checking a Merkle proof the following "standard" [Open Zeppelin library](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/MerkleProof.sol) can be used.

## Hashing Function

Given two attestation hashes `a1` and `a2`, the `Shash(a1, a2)` function used in Solidity is defined as follows:

```solidity
keccak256(abi.encode(a1, a2));
```

Where variables `a1` and `a2` are of type `bytes32`.

In _web3.js_ we the equivalent definition is:

```javascript
web3.eth.abi.encodeParameters(["bytes32", "bytes32"], [a1, a2]);
```

Where `a1` and `a2` are `0x`-prefixed hex strings representing 32-bytes.

Next: [Attestation Provider Behavior](./voting-behavior.md)

[Back to Home](../README.md)

/**
 * There are several variants for hashing sequences in Merkle trees in cases when there is odd number of hashes on some level.
 * - Bitcoin hashes remaining hash with itself
 * - Ethereum community was considering this:
 *     https://github.com/proofchains/python-proofmarshal/blob/efe9b58921b9a306f2b3552c30b84e1043ab866f/proofmarshal/mmr.py#L96
 * - This review shows various options and in particular it describes the "Monero way", which gives balanced trees but they
 *   had some issues with bugs
 *     https://medium.com/coinmonks/merkle-trees-concepts-and-use-cases-5da873702318
 *
 * The current implementation is a derivation and simplification of "Monero" way. It uses ideas
 * from binary heaps represented in array. This significantly simplifies the construction both of a Merkle tree and a proof.
 *
 * Important formulas for a left-aligned full tree represented in an array for n hashes as leafs
 * - array has exactly 2*n - 1 nodes (n leafs other internal)
 * - array[0] is merkle root, array[n-1, ..., 2*n - 2] contains leaf hashes in order
 * - given tree array of length l = 2*n - 1, then n = floor((l + 1)/2) --- be careful with 1 element
 * - parent(i) = Math.floor((i - 1) / 2);
 * - left(i) = 2*i + 1
 * - right(i) = 2*i + 2
 *
 * Importants: all input strings should represent bytes32, hence should be 32-byte padded hex strings.
 */

import { ethers } from "ethers";

const coder = ethers.AbiCoder.defaultAbiCoder();

/**
 * Single value hash function. Uses keccak function compatible with the one used in Solidity
 * It is supposed to be used with `0x`-prefixed 32-byte strings as hex values
 * @param val input hash in form of the string `0x` prefixed.
 * @returns hash of the input value
 */
export function singleHash(val: string) {
    return ethers.keccak256(val);
}

/**
 * Helper function for constructing the commit hash used with StateConnector.sol contract
 * @param merkleRoot merkle root (`0x`-prefixed 32-byte hex string)
 * @param randomNumber secure random number (`0x`-prefixed 32-byte hex string)
 * @param address addres (`0x`-prefixed 20-byte hex string)
 * @returns `0x`-prefixed 32-byte hex string (hash)
 */
export function commitHash(merkleRoot: string, randomNumber: string, address: string): string {
    return ethers.keccak256(coder.encode(["bytes32", "bytes32", "address"], [merkleRoot, randomNumber, address]))!;
}

/**
 * A sorted hash of two 32-byte strings
 * @param x first `0x`-prefixed 32-byte hex string
 * @param y second `0x`-prefixed 32-byte hex string
 * @returns the sorted hash
 */
export function sortedHashPair(x: string, y: string) {
    if (x <= y) {
        return ethers.keccak256(coder.encode(["bytes32", "bytes32"], [x, y]));
    }
    return ethers.keccak256(coder.encode(["bytes32", "bytes32"], [y, x]));
}

/**
 * Merkle tree implementation with all the helper function for constructing the tree and extracting the root and proofs for every leaf.
 */
export class MerkleTree {
    _tree: string[] = [];

    constructor(values: string[]) {
        this.build(values);
    }

    /**
     * Merkle root
     */
    public get root() {
        return this._tree.length === 0 ? undefined : this._tree[0];
    }

    /**
     * The array representing full tree (length is `2*hashCount - 1`)
     */
    public get tree(): string[] {
        return [...this._tree];
    }

    /**
     * Number of leaves in the Merkle tree
     */
    public get hashCount() {
        return this._tree.length ? (this._tree.length + 1) / 2 : 0;
    }

    /**
     * Returns leaves in array of the length `hashCount` sorted as `0x`-prefixed 32-byte hex strings.
     */
    public get sortedHashes() {
        return this._tree.slice(this.hashCount - 1);
    }

    /**
     * Parent index of the node at index `i` in array
     * @param i index of a node in the Merkle tree
     * @returns parent index
     */
    public parent(i: number) {
        return Math.floor((i - 1) / 2);
    }

    /**
     * Given an array of leave hashes (`0x`-prefixed 32-byte hex strings) it builds the Merkle tree.
     * @param values
     */
    private build(values: string[]) {
        values.forEach((x) => {
            if (!/^0x[0-9a-f]{64}$/i.test(x)) {
                throw new Error(`Invalid hash '${x}'`);
            }
        });
        const sorted = values.map((x) => x);
        sorted.sort();

        const hashes = [];
        for (let i = 0; i < sorted.length; i++) {
            if (i == 0 || sorted[i] !== sorted[i - 1]) {
                hashes.push(sorted[i]);
            }
        }
        const n = hashes.length;
        this._tree = [...new Array(Math.max(n - 1, 0)).fill(0), ...hashes];
        for (let i = n - 2; i >= 0; i--) {
            this._tree[i] = sortedHashPair(this._tree[2 * i + 1], this._tree[2 * i + 2])!;
        }
    }

    /**
     * Returns the hash of the `i`-th leaf (index determined by sorting and positioning in the build)
     * @param i
     * @returns
     */
    public getHash(i: number): string | undefined {
        if (this.hashCount === 0 || i < 0 || i >= this.hashCount) {
            return undefined;
        }
        const pos = this._tree.length - this.hashCount + i;
        return this._tree[pos];
    }

    /** Binary search
     * Famously prone to subtle bugs, so over-documented with proof
     */
    private binarySearch(hash: string): number | undefined {
        let [low, high] = [0, this.hashCount];
        let count = high;
        if (count == 0) return undefined;
        while (count > 1) {
            // Invariants: low < high, 2 <= count == high - low == [low .. high].length
            const mid = low + Math.floor(count / 2); // low < mid < high _strictly_
            hash < this.sortedHashes[mid] ? (high = mid) : (low = mid); // low < high still
            count = high - low; // preserves invariant
        }
        const i = low; // Only element left: count == 1, since 0 != count <= 1
        if (hash != this.sortedHashes[i]) return undefined;
        return i;
    }

    /**
     * Extracts the Merkle proof for the given hash, if it is in the tree
     * @param hashOrIndex the hash whose proof to return
     * @returns the Merkle proof - a list of `0x`-prefixed 32-byte hex strings
     */
    public getProof(hashOrIndex: string | number): string[] | undefined {
        if (this.hashCount === 0) {
            return undefined;
        }
        if (hashOrIndex === undefined) return undefined;
        let i: number | undefined;
        if (typeof hashOrIndex === "number") {
            i = hashOrIndex;
        } else if (typeof hashOrIndex === "string") {
            if (/^0x[0-9a-f]{64}$/i.test(hashOrIndex)) {
                i = this.binarySearch(hashOrIndex);
            } else {
                return undefined;
            }
        }
        if (i === undefined) return undefined;
        if (i < 0 || i >= this.hashCount) {
            return undefined;
        }

        const proof: string[] = [];
        let pos = this._tree.length - this.hashCount + i;
        while (pos > 0) {
            proof.push(
                this._tree[pos + 2 * (pos % 2) - 1], // if pos even, take left sibling at pos - 1, else the right sibling at pos + 1
            );
            pos = this.parent(pos);
        }
        return proof;
    }
}

/**
 * Verifies a Merkle proof for a given leaf
 * @param leaf leaf as (`0x`-prefixed 32-byte hex string)
 * @param proof Merkle proof (a list of `0x`-prefixed 32-byte hex strings)
 * @param root Merkle root (`0x`-prefixed 32-byte hex string)
 * @returns `true` if the proof is valid, `false` otherwise
 */
export function verifyWithMerkleProof(leaf: string, proof: string[], root: string) {
    if (!leaf || !proof || !root) return false;
    let hash = leaf;
    for (const pair of proof) {
        hash = sortedHashPair(pair, hash)!;
    }
    return hash == root;
}

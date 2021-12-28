import Web3 from "web3";
import { toBN } from "web3-utils";
import { string } from "yargs";
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
 * - left_son(i) = 2*i + 1
 * - right_son(i) = 2*i + 2
 */
// 
// 

const web3 = new Web3();
const hashPair = (x: string, y: string) => web3.utils.soliditySha3(web3.eth.abi.encodeParameters(['bytes32', 'bytes32'], [x, y]));

export type MerkleSide = 0 | 1
export interface HashPairEntry {
  index: MerkleSide;
  hash: string;
}

export interface MerkleProof {
  tx: string;
  hashPairs?: HashPairEntry[];
}

export class MerkleTree {
  _tree: string[] = [];
  initialHash = false;

  constructor(values: string[], initialHash = false) {
    this.initialHash = initialHash;
    this.build(values);
  }

  get root() {
    return this._tree.length === 0 ? null : this._tree[0];
  }

  get rootBN() {
    let rt = this.root;
    return rt ? toBN(rt) : toBN(0);
  }

  get tree(): string[] {
    return [...this._tree];
  }

  get hashCount() {
    return this._tree.length ? (this._tree.length + 1) / 2 : 0;
  }

  parent(i: number) {
    return Math.floor((i - 1) / 2);
  }

  build(values: string[]) {
    let n = values.length;
    this._tree = [... new Array(n - 1).fill(0), ...values.map(val => this.initialHash ? web3.utils.soliditySha3(val)! : val)]
    for(let i = n - 2; i >= 0; i--) {
      this._tree[i] = hashPair(this._tree[2*i + 1], this._tree[2*i + 2])!
    }
    // console.log(this._tree)
  }

  getHash(i: number) {
    if (this.hashCount === 0 || i < 0 || i >= this.hashCount) {
      return null;
    }    
    let pos = this._tree.length - this.hashCount + i;
    return this._tree[pos];
  }

  getProof(i: number) {
    if (this.hashCount === 0 || i < 0 || i >= this.hashCount) {
      return null;
    }
    let pos = this._tree.length - this.hashCount + i;
    let proof = {
      tx: this._tree[pos],
      hashPairs: []
    } as MerkleProof;
    while (pos > 0) {
      proof.hashPairs!.push({
        index: pos % 2 as MerkleSide,  
        hash: this._tree[pos + 2*(pos % 2) - 1]  // if pos even, take left sibiling at pos - 1, else the right sibiling at pos + 1
      });
      pos = this.parent(pos)
    }
    return proof;
  }

  verify(proof: MerkleProof) {
    if (!proof || !this.root) return false;
    let hash = proof.tx;
    for(let pair of proof.hashPairs!) {
      hash = pair.index === 0 ? hashPair(pair.hash, hash)! : hashPair(hash, pair.hash)!;
    }
    return hash === this.root;
  }

}

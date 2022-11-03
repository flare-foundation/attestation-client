import { MerkleTree } from "../../lib/utils/MerkleTree";
import { toHex } from "../../lib/verification/attestation-types/attestation-types-helpers";
import { assert } from "chai";

const N = 20;

describe("Merkle Tree", () => {
  const makeHashes = (i: number) => new Array(i).fill(0).map((x) => toHex(Math.floor(Math.random() * 10000000000000), 32));

  describe("General functionalities", () => {
    it("Should be able to create empty tree form empty array", async () => {
      const tree = new MerkleTree([]);
      assert(tree.hashCount === 0);
      assert(tree.root === null);
      assert(tree.rootBN.eqn(0));
      assert(tree.sortedHashes.length === 0);
      assert(tree.tree.length === 0);
    });

    it("Should tree for n hashes have 2*n - 1 nodes", async () => {
      for (let i = 1; i < 10; i++) {
        const hashes = makeHashes(i);
        const tree = new MerkleTree(hashes);
        assert(tree.tree.length === 2 * i - 1);
        assert(tree.hashCount === i);
      }
    });

    it("Should leaves match to initial hashes", async () => {
      for (let i = 1; i < 10; i++) {
        const hashes = makeHashes(i);
        const tree = new MerkleTree(hashes);
        const sortedHashes = tree.sortedHashes;
        for (let j = 0; j < i; j++) {
          assert(sortedHashes.indexOf(hashes[j]) >= 0);
        }
      }
    });

    it("Should merkle proof work for up to 10 hashes", async () => {
      for (let i = 1; i < 100; i++) {
        const hashes = makeHashes(i);
        const tree = new MerkleTree(hashes);
        for (let j = 0; j < tree.hashCount; j++) {
          const leaf = tree.getHash(j);
          const proof = tree.getProof(j);
          const ver = tree.verify(leaf!, proof!);
          assert(ver);
        }
      }
    });
  });
});

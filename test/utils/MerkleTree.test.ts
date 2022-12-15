import { commitHash, MerkleTree, singleHash, sortedHashPair, verifyWithMerkleProof } from "../../lib/utils/MerkleTree";
import { toHex } from "../../lib/verification/attestation-types/attestation-types-helpers";
import { assert, expect } from "chai";
import { getTestFile } from "../test-utils/test-utils";

const N = 20;

describe(`Merkle Tree (${getTestFile(__filename)})`, () => {
  const makeHashes = (i: number) => new Array(i).fill(0).map((x) => toHex(Math.floor(Math.random() * 10000000000000), 32));

  describe("General functionalities", () => {
    it("Should be able to create empty tree form empty array", () => {
      const tree = new MerkleTree([]);
      assert(tree.hashCount === 0);
      assert(tree.root === null);
      assert(tree.rootBN.eqn(0));
      assert(tree.sortedHashes.length === 0);
      assert(tree.tree.length === 0);
      assert(tree.getHash(1) === null);
      assert(tree.getProof(1) === null);
    });

    it("Should tree for n hashes have 2*n - 1 nodes", () => {
      for (let i = 1; i < 10; i++) {
        const hashes = makeHashes(i);
        const tree = new MerkleTree(hashes);
        assert(tree.tree.length === 2 * i - 1);
        assert(tree.hashCount === i);
        assert(tree.rootBN);
      }
    });

    it("Should leaves match to initial hashes", () => {
      for (let i = 1; i < 10; i++) {
        let hashes = makeHashes(i);
        const tree = new MerkleTree(hashes);
        const sortedHashes = tree.sortedHashes;
        for (let j = 0; j < i; j++) {
          assert(sortedHashes.indexOf(hashes[j]) >= 0);
        }
      }
    });

    it("Should omit duplicates", () => {
      const tree = new MerkleTree(["a", "a", "1"], true);
      assert(tree.tree.length === 3);
    });

    it("Should leaves match to initial hashes with initual hash set to true", () => {
      for (let i = 1; i < 10; i++) {
        let hashes = makeHashes(i);
        const tree = new MerkleTree(hashes, true);
        let sortedHashes = tree.sortedHashes;
        for (let j = 0; j < i; j++) {
          assert(sortedHashes.indexOf(singleHash(hashes[j])) >= 0);
        }
      }
    });

    it("Should merkle proof work for up to 10 hashes", () => {
      for (let i = 2; i < 100; i++) {
        const hashes = makeHashes(i);
        const tree = new MerkleTree(hashes);
        // console.log(tree);
        for (let j = 0; j < tree.hashCount; j++) {
          const leaf = tree.getHash(j);
          const proof = tree.getProof(j);
          const ver = verifyWithMerkleProof(leaf, proof, tree.root);
          expect(ver).to.be.eq(true);
        }
      }
    });

    it("Should reject insufficient data", () => {
      for (let i = 1; i < 100; i++) {
        let hashes = makeHashes(i);
        const tree = new MerkleTree(hashes);
        assert(!verifyWithMerkleProof(tree.getHash(i), [], tree.root));
        assert(!verifyWithMerkleProof("", tree.getProof(i), tree.root));
        assert(!verifyWithMerkleProof(tree.getHash(i), tree.getProof(i), ""));
      }
    });

    it("Should reject false proof", () => {
      for (let i = 2; i < 100; i++) {
        let hashes1 = makeHashes(i);
        let hashes2 = makeHashes(i);
        const tree1 = new MerkleTree(hashes1);
        const tree2 = new MerkleTree(hashes2);
        for (let j = 0; j < i; j++) {
          expect(verifyWithMerkleProof(tree1.getHash(j), tree1.getProof(j), tree1.root)).to.be.true;
          expect(verifyWithMerkleProof(tree1.getHash(j), tree2.getProof(j), tree1.root)).to.be.false;
          assert(!verifyWithMerkleProof(tree1.getHash(j), tree1.getProof(j), tree2.root));
        }
      }
    });

    it("Should prepare commit hash", () => {
      let merkleRoot = new MerkleTree(makeHashes(55)).root;
      let address = "0x780023EE3B120dc5bDd21422eAfe691D9f37818D";
      let randomNum = toHex(1289);
      assert(commitHash(merkleRoot, randomNum, address).slice(0, 2) === "0x");
    });
  });
});

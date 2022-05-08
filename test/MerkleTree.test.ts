import { MerkleTree } from "../lib/utils/MerkleTree";
import { toHex } from "../lib/verification/attestation-types/attestation-types-helpers";
import { MerkleInstance } from "../typechain-truffle";

const N = 20;

describe("Merkle Tree", () => {
  const makeHashes = (i: number) => (new Array(i)).fill(0).map(x =>  toHex(Math.floor(Math.random()*10000000000000), 32));

  describe("General functionalities", () => {

    it("Should be able to create empty tree form empty array",async () => {
      let tree = new MerkleTree([])
      assert(tree.hashCount === 0);
      assert(tree.root === null);
      assert(tree.rootBN.eqn(0));
      assert(tree.sortedHashes.length === 0);
      assert(tree.tree.length === 0);
    });

    it("Should tree for n hashes have 2*n - 1 nodes", async () => {
      for (let i = 1; i < 10; i++) {
        let hashes = makeHashes(i)
        const tree = new MerkleTree(hashes)
        assert(tree.tree.length === 2 * i - 1);
        assert(tree.hashCount === i);
      }
    });

    it("Should leaves match to initial hashes", async () => {
      for (let i = 1; i < 10; i++) {
        let hashes = makeHashes(i)
        const tree = new MerkleTree(hashes);
        let sortedHashes = tree.sortedHashes;
        for (let j = 0; j < i; j++) {
          assert(sortedHashes.indexOf(hashes[j]) >= 0);
        }
      }
    });

    it("Should merkle proof work for up to 10 hashes", async () => {
      for (let i = 1; i < 100; i++) {
        let hashes = makeHashes(i)
        const tree = new MerkleTree(hashes)
        for (let j = 0; j < tree.hashCount; j++) {
          let leaf = tree.getHash(j);
          let proof = tree.getProof(j);
          let ver = tree.verify(leaf!, proof!);
          assert(ver)
        }
      }
    });
  });

  describe("Checking proofs on a contract", () => {

    let merkle: MerkleInstance;

    beforeEach(async () => {
      let Merkle = artifacts.require("Merkle");
      merkle = await Merkle.new();
    });

    it(`Should proof verification for up to ${N} hashes work on contract`, async () => {
      for (let i = 10; i <= N; i++) {
        let hashes = makeHashes(i)
        
        const tree = new MerkleTree(hashes)
        // console.log(i, tree.hashCount)
        for (let j = 0; j < tree.hashCount; j++) {
          let proof = tree.getProof(j);
          let leaf = tree.getHash(j);
          let ver0 = tree.verify(leaf!, proof!);
          assert(ver0, "Not verified TS")
          let ver = await merkle.verifyMerkleProof(
            proof!,
            tree.root!,
            leaf!
          );
          assert(ver, "Not verified SC")
        }
      }
    });
  });

});

import { MerkleTree } from "../lib/MerkleTree";
import { HashTestInstance } from "../typechain-truffle";

describe("Merkle Tree", () => {
  const makeHashes = (i: number) => (new Array(i)).fill(0).map(x => "0x" + Math.floor(Math.random()*100000000));

  describe("General functionalities", () => {

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
        for (let j = 0; j < i; j++) {
          assert(tree.getHash(j) === hashes[j]);
        }
      }
    });

    it("Should merkle proof work for up to 10 hashes", async () => {
      for (let i = 1; i < 10; i++) {
        let hashes = makeHashes(i)
        const tree = new MerkleTree(hashes)
        for (let i = 0; i < tree.hashCount; i++) {
          let proof = tree.getProof(i);
          let ver = tree.verify(proof!);
          assert(ver)
        }
      }
    });
  });

  describe("Checking proofs on a contract", () => {

    let hashTest: HashTestInstance;

    beforeEach(async () => {
      let HashTest = artifacts.require("HashTest");
      hashTest = await HashTest.new();
    });

    it("Should proof verification for up to 10 hashes work on contract", async () => {
      for (let i = 1; i < 10; i++) {
        let hashes = makeHashes(i)
        const tree = new MerkleTree(hashes)
        for (let i = 0; i < tree.hashCount; i++) {
          let proof = tree.getProof(i);
          let ver = await hashTest.verifyMerkleProof(
            proof?.tx!,
            proof?.hashPairs?.map(x => x.index)!,
            proof?.hashPairs?.map(x => x.hash)!,
            tree.root!
          );
          assert(ver)
        }
      }
    });
  });

});

import { MerkleTree } from "../lib/utils/MerkleTree";
import { prefix0x } from "../lib/MCC/utils";
import { HashTestInstance } from "../typechain-truffle";
import { toHex } from "../lib/utils/utils";

const N = 20;

describe("Merkle Tree", () => {
  const makeHashes = (i: number) => (new Array(i)).fill(0).map(x =>  toHex(Math.floor(Math.random()*10000000000000), true));

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

    let hashTest: HashTestInstance;

    beforeEach(async () => {
      let HashTest = artifacts.require("HashTest");
      hashTest = await HashTest.new();
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
          let ver = await hashTest.verifyMerkleProof(
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

import { MerkleTree } from "../../lib/utils/MerkleTree";
import { toHex } from "../../lib/verification/attestation-types/attestation-types-helpers";
import { MerkleInstance } from "../../typechain-truffle";

const N = 20;

describe("Merkle Tree", () => {
  const makeHashes = (i: number) => new Array(i).fill(0).map((x) => toHex(Math.floor(Math.random() * 10000000000000), 32));

  describe("Checking proofs on a contract", () => {
    let merkle: MerkleInstance;

    beforeEach(async () => {
      let Merkle = artifacts.require("Merkle");
      merkle = await Merkle.new();
    });

    it(`Should proof verification for up to ${N} hashes work on contract`, async () => {
      for (let i = 10; i <= N; i++) {
        let hashes = makeHashes(i);

        const tree = new MerkleTree(hashes);
        // console.log(i, tree.hashCount)
        for (let j = 0; j < tree.hashCount; j++) {
          let proof = tree.getProof(j);
          let leaf = tree.getHash(j);
          let ver0 = tree.verify(leaf!, proof!);
          assert(ver0, "Not verified TS");
          let ver = await merkle.verifyMerkleProof(proof!, tree.root!, leaf!);
          assert(ver, "Not verified SC");
        }
      }
    });
  });
});

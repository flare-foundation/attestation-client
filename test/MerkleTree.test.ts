import { Hash } from "../lib/Hash";
import { MerkleTree } from "../lib/MerkleTree";

describe("Merkle Tree", () => {
  describe("General functionalities", function () {
    it("Basic test", async function () {
      const tree = new MerkleTree(["1"]);

      expect(tree.root()).toBe(Hash.create("1"));

      tree.createMerkleTreeHash(["1", "2"]);

      expect(tree.root()).toBe(Hash.create(Hash.create("1") + Hash.create("2")));

      tree.createMerkleTreeHash(["1", "2", "3"]);

      expect(tree.root()).toBe(Hash.create(Hash.create(Hash.create("1") + Hash.create("2")) + Hash.create(Hash.create("3"))));

      tree.createMerkleTreeHash(["1", "2", "3", "4"]);

      expect(tree.root()).toBe(Hash.create(Hash.create(Hash.create("1") + Hash.create("2")) + Hash.create(Hash.create("3") + Hash.create("4"))));
    });
  });
});

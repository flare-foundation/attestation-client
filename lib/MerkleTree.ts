import { Hash } from "./Hash";

export class MerkleTree {
  tree = new Array<any>();

  constructor(values: string[]) {
    this.createMerkleTreeHash(values);
  }

  root() {
    return this.tree[this.tree.length - 1][0];
  }

  createMerkleTreeHash(values: string[]) {
    this.tree = new Array<any>();

    // create bottom row hashes
    let step = new Array<string>();
    for (const tx of values) {
      step.push(Hash.create(tx));
    }

    // make sure all lengts > 1 are even
    if (step.length > 1 && step.length & 1) {
      step.push("");
    }

    this.tree.push(step);

    while (step.length > 1) {
      const nextStep = new Array<string>();

      for (let a = 0; a < step.length; a += 2) {
        nextStep.push(Hash.create(step[a] + step[a + 1]));
      }

      if (nextStep.length > 1 && nextStep.length & 1) {
        nextStep.push("");
      }

      this.tree.push(nextStep);
      step = nextStep;
    }

    return this.tree;
  }
}

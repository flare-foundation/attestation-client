// yarn test test/choose-subsets/combinators.test.ts

import { expect } from "chai";
import { stringify } from "safe-stable-stringify";
import { chooseCandidate, getSubsetsOfSize } from "../../lib/choose-subsets-lib/subsets-lib";

function dec2bin(dec) {
  return (dec >>> 0).toString(2);
}

function arrayEquality(a: any[], b: any[]) {
  return stringify(a) === stringify(b);
}

describe("Choose round combinator lib test", function () {
  beforeEach(async () => {});

  it("Two choose common 1s ", async function () {
    const a = 0b10101010;
    const b = 0b01010101;

    const res = a & b;

    console.log(dec2bin(res));
  });

  describe("Count 'ones'", function () {
    it.only("Test", async function () {
      const a = 0b10101010;
      const b = 0b01010101;
  
      console.log(a >>> 0);
    
    });
  })
  

  it("Test getSubsetsOfSize number of elements", async function () {
    const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const subSets = getSubsetsOfSize(elements, 7);

    expect(subSets.length).to.eq(36);
  });

  it("Test getSubsetsOfSize for all subsets of size 2 in a set of size 3", async function () {
    const elements = [1, 2, 3];
    const subSets = getSubsetsOfSize(elements, 2);

    expect(subSets.length).to.eq(3);
    expect(subSets.find((elem) => arrayEquality(elem.sort(), [1, 2])));
    expect(subSets.find((elem) => arrayEquality(elem.sort(), [1, 3])));
    expect(subSets.find((elem) => arrayEquality(elem.sort(), [2, 3])));
  });

  it("Speed test", async function () {
    const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    console.time("subsets");
    const subSets = getSubsetsOfSize(elements, 15);
    console.timeEnd("subsets");

    expect(subSets.length).to.eq(15504);
  });

  it("Test chooseCandidate", async function () {
    const elements = [0b10001111, 0b10001111, 0b10001100];

    const candidates = chooseCandidate(elements, 2);

    candidates.map(elem => console.log(dec2bin(elem)))

    console.log(candidates);
  });
});

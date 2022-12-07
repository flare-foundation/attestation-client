import { getSubsetsOfSize, getSubsetsOfSizeSlow } from "../../lib/choose-subsets-lib/subsets-lib";
import { expect } from "chai";
import { stringify } from "safe-stable-stringify";

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

  it("Test getSubsetsOfSize number of elements", async function () {
    const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const permutations = getSubsetsOfSize(elements, 7);

    expect(permutations.length).to.eq(36);
  });

  it("Test getSubsetsOfSize for all subsets of size 2 in a set of size 3", async function () {
    const elements = [1, 2, 3];
    const permutations = getSubsetsOfSize(elements, 2);

    expect(permutations.length).to.eq(3);
    expect(permutations.find((elem) => arrayEquality(elem.sort(), [1, 2])));
    expect(permutations.find((elem) => arrayEquality(elem.sort(), [1, 3])));
    expect(permutations.find((elem) => arrayEquality(elem.sort(), [2, 3])));
  });

  it("Speed test slow", async function () {
    const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    console.time("subsets_slow");
    const permutations = getSubsetsOfSizeSlow(elements, 15);
    console.timeEnd("subsets_slow");

    expect(permutations.length).to.eq(15504);
  });

  it("Speed test fast", async function () {
    const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    console.time("subsets");
    const permutations = getSubsetsOfSize(elements, 15);
    console.timeEnd("subsets");

    expect(permutations.length).to.eq(15504);
  });
});

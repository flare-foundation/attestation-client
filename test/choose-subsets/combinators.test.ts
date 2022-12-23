// yarn test test/choose-subsets/combinators.test.ts

import { expect } from "chai";
import { stringify } from "safe-stable-stringify";
import { chooseCandidate, countOnes, getSubsetsOfSize, hexStringAnd } from "../../src/choose-subsets-lib/subsets-lib";
import { getTestFile } from "../test-utils/test-utils";

function arrayEquality(a: any[], b: any[]) {
  return stringify(a.sort()) === stringify(b.sort());
}

describe(`Choose round combinator lib test (${getTestFile(__filename)})`, function () {
  it("Two choose common 1s ", async function () {
    const a =
      "0xd954ad026f981f6d4cb0928b41d71971df08a0b2f46102f53ba88652166b25751cb949cf2e01cc6a445aa5a19b9de63e4950032517097108706b2e1d896fb4bdee9c9e02b60154287bdc1905d8bb8becb82e18e50342680f004f5fcefb9290c911964c4b20696292e69c359dfc0b66acba7da12d2526183340bda3019a0646a4105f0c3f77f0ce5ec750017608a390f5db2d6eec51bf75d5184954a6c5308284c5ab852bf9b728ab3dd619114b769371f5690a9e222337182c5b24bc36ab93fe1c547d495fd4bfd4";
    const b =
      "0x26bad89bdf5804ae76405edc35be82fd4c7ab8260d60a101070e8b1a42a16c5f8579ef5000abdf2dec491a38c2c783292acdaaf16837dceff040cc1a92c310b93c9230ff75e8f87b30807a9617dc30b374946b62ea7f6f451b0727f8351031e8e5c62081283947e23593a558b88748bc4f160aaec778b93f17e266ee4b89abf69bf882ed2bbdb9d1f552880aa52051e66562c0353d317fd95eaa0ced9a7f3ec270836ba158aea65e11d7d86d9eb777ef584a46437842793638e7d90838b30b727cfdf1f74655e086";

    const c = "0xff";
  });

  describe("Hex string AND", function () {
    it("Test common and", async function () {
      const a = "0xaaaa";
      const b = "0x5555";

      const and = hexStringAnd(a, b);
      expect(and).to.eq("0x0000");
    });

    it("Test common and", async function () {
      const a = "0xAAAA";
      const b = "0x5555";

      const and = hexStringAnd(a, b);
      expect(and).to.eq("0x0000");
    });

    it("Test common and", async function () {
      const a = "0x5555";
      const b = "0x5555";

      const and = hexStringAnd(a, b);
      expect(and).to.eq("0x5555");
    });

    it("Test common and", async function () {
      const a = "0x8001";
      const b = "0x425D";

      const and = hexStringAnd(a, b);
      expect(and).to.eq("0x0001");
    });
  });

  describe("Count 'ones'", function () {
    it("Test count ones", async function () {
      const a = "0x5555";
      const count = countOnes(a);

      expect(count).to.eq(8);
    });

    it("Test count ones", async function () {
      const a = "0x8001";
      const count = countOnes(a);

      expect(count).to.eq(2);
    });

    it("Test count ones", async function () {
      const a = "0xffff";
      const count = countOnes(a);

      expect(count).to.eq(16);
    });

    it("Test count ones", async function () {
      const a = "0xAAAA";
      const count = countOnes(a);

      expect(count).to.eq(8);
    });

    it("Test count ones", async function () {
      const a = "0x0000";
      const count = countOnes(a);

      expect(count).to.eq(0);
    });
  });

  describe("getSubsetsOfSize tests", function () {
    it("Test getSubsetsOfSize number of elements", async function () {
      const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const subSets = getSubsetsOfSize(elements, 7);
  
      expect(subSets.length).to.eq(36);
    });
  
    it("Test getSubsetsOfSize for all subsets of size 2 in a set of size 3", async function () {
      const elements = [1, 2, 3];
      const subSets = getSubsetsOfSize(elements, 2);
  
      expect(subSets.length).to.eq(3);
      expect(subSets.find((elem) => arrayEquality(elem, [1, 2])));
      expect(subSets.find((elem) => arrayEquality(elem, [1, 3])));
      expect(subSets.find((elem) => arrayEquality(elem, [2, 3])));
    });

    it("Test getSubsetsOfSize for all subsets of size 2 in a set of size 4", async function () {
      const elements = [1, 2, 3, 4];
      const subSets = getSubsetsOfSize(elements, 2);
  
      expect(subSets.length).to.eq(6);
      expect(subSets.find((elem) => arrayEquality(elem, [1, 2])));
      expect(subSets.find((elem) => arrayEquality(elem, [1, 3])));
      expect(subSets.find((elem) => arrayEquality(elem, [2, 3])));
      expect(subSets.find((elem) => arrayEquality(elem, [1, 4])));
      expect(subSets.find((elem) => arrayEquality(elem, [2, 4])));
      expect(subSets.find((elem) => arrayEquality(elem, [3, 4])));
    });
  
    it("Speed test", async function () {
      const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const subSets = getSubsetsOfSize(elements, 15);
      expect(subSets.length).to.eq(15504);
    });
  })

  describe("getSubsetsOfSize tests", function () {
    it("Test chooseCandidate", async function () {
      const elements = ["0xAAAA", "0xffff", "0xB355"];
      const candidate = chooseCandidate(elements, 2);
      expect(candidate).to.eq("0xb355")
    });

    it("Possible real world scenario test", function (){
      const chooses = [
        "0x954ace992099e7479fc59e5ccd4cb06fec54a1777a1eedf9a1",
        "0xfe5b9fa1f6b8e1062a0fd493680b7f26b164810f0ddaef0baf",
        "0xbc20b90414a9c7ab4a69a97cb0604fdd78474b340e541ad975",
        "0xab9ccad6fb60b05dd128bbb5129665823ce6d3950b72c1a7fa",
        "0x41f4ac5bf6fe50ff8408f2eab6d098d4822a67afe09b0c88fc",
        "0xab4818b2262aff820d3554b48ead16c9681dcee8574ce86aea",
        "0x62149908a29c4cfeca6a3f9aab7ec2b3cadd229584ec089cab",
        "0xf3ff0e801c89bc2b697373d1df9159faa04d7f25854b568766",
        "0x346ffced36dcdca0f0c924c6464433373e49b354b20f066187",
      ]
      const candidate = chooseCandidate(chooses, 7);

      expect(candidate).to.eq("0x00000800008800000000000000000000000000040000000000")
    })
  })

  
});

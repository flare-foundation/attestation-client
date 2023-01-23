// yarn test test/choose-subsets/combinators.test.ts

import BN from "bn.js";
import { assert } from "chai";
import { BitmaskAccumulator } from "../../src/choose-subsets-lib/BitmaskAccumulator";
import { getTestFile } from "../test-utils/test-utils";

const N_MAX = 42;

describe(`BitmaskAccumulator.ts (${getTestFile(__filename)})`, function () {
  it("Should correctly accumulate bits", async function () {
    let lst = [true, true, false, true, false, true, false, true, false, true];
    let n = lst.length;
    let bitmask = new BitmaskAccumulator(n);
    let bitmaskString = ""
    let bitmaskBn = new BN(0);

    for (let i = 0; i < n; i++) {
      let bit = lst[i]
      bitmask.addBit(bit);
      bitmaskString += bit ? "1" : "0";
      bitmaskBn = bitmaskBn.mul(new BN(2)).add(bit ? new BN(1) : new BN(0));
    }
    // pad BN to full last byte
    let toPad = n % 8 ? 8 - n % 8 : 0;
    for (let i = 0; i < toPad; i++) {
      bitmaskBn = bitmaskBn.mul(new BN(2));
    }

    assert(bitmask.toHex().toLowerCase() === bitmaskBn.toString(16).toLowerCase(), "Hex value do not match BN hex");
    let accuFromString = BitmaskAccumulator.fromBitString(bitmaskString);
    assert(bitmask.buffer.length === accuFromString.buffer.length, "Buffer lengths do not match");
    for (let i = 0; i < bitmask.buffer.length; i++) {
      assert(bitmask.buffer[i] === accuFromString.buffer[i], `Buffer values on index ${i} do not match`);
    }
    assert(bitmaskBn.toString(16).toLowerCase() === accuFromString.toHex().toLowerCase(), "BN hex value and bitmask string constructed value do not match");
  });


  it(`Should correctly accumulate random bits in range from 1 to ${N_MAX}`, async function () {
    for (let n = 1; n <= N_MAX; n++) {
      let bitmask = new BitmaskAccumulator(n);
      let bitmaskString = ""
      let bitmaskBn = new BN(0);

      for (let i = 0; i < n; i++) {
        let bit = Math.random() > 0.5;
        // let bit = lst[i]
        bitmask.addBit(bit);
        bitmaskString += bit ? "1" : "0";
        bitmaskBn = bitmaskBn.mul(new BN(2)).add(bit ? new BN(1) : new BN(0));
      }
      // pad BN to full last byte
      let toPad = n % 8 ? 8 - n % 8 : 0;
      for (let i = 0; i < toPad; i++) {
        bitmaskBn = bitmaskBn.mul(new BN(2));
      }

      // console.log("----------")
      // console.log(bitmask.toHex())
      // console.log(bitmaskBn.toString(16))
      // console.log(bitmaskString)

      assert(parseInt(bitmask.toHex(), 16) === parseInt(bitmaskBn.toString(16), 16), `Hex value do not match BN hex for n=${n}: ${bitmaskString}`);
      let accuFromString = BitmaskAccumulator.fromBitString(bitmaskString);
      assert(bitmask.buffer.length === accuFromString.buffer.length, `Buffer lengths do not match for n=${n}: ${bitmaskString}`);
      for (let i = 0; i < bitmask.buffer.length; i++) {
        assert(bitmask.buffer[i] === accuFromString.buffer[i], `Buffer values on index ${i} do not match for n=${n}: ${bitmaskString}`);
      }
      assert(parseInt(bitmaskBn.toString(16), 16) === parseInt(accuFromString.toHex(), 16), `BN hex value and bitmask string constructed value do not match for n=${n}: ${bitmaskString}`);
    }
  });

});

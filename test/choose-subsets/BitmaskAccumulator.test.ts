// yarn test test/choose-subsets/combinators.test.ts

import BN from "bn.js";
import { assert } from "chai";
import { BitmaskAccumulator, padBitString } from "../../src/choose-subsets-lib/BitmaskAccumulator";
import { getTestFile } from "../test-utils/test-utils";

const N_MAX = 42;
const N_MAX_MISSING = 42;
const N_REPEAT_MISSING = 10;
const RAND_OFFSET = 0.25;
const N_MAX_INDICES = 42;
const N_REPEAT_INDICES = 10;

function randomBitSequence(n: number, fullLength = true, weightFor1 = 0.5) {
  const length = fullLength ? n : Math.floor(Math.random() * (n + 1));
  let sequence = "";
  for (let i = 0; i < length; i++) {
    sequence += Math.random() < weightFor1 ? "1" : "0"
  }
  return sequence;
}

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

    assert(bitmask.toHex().toLowerCase().slice(2) === bitmaskBn.toString(16).toLowerCase(), "Hex value do not match BN hex");
    let accuFromString = BitmaskAccumulator.fromBitString(bitmaskString);
    assert(bitmask.buffer.length === accuFromString.buffer.length, "Buffer lengths do not match");
    for (let i = 0; i < bitmask.buffer.length; i++) {
      assert(bitmask.buffer[i] === accuFromString.buffer[i], `Buffer values on index ${i} do not match`);
    }
    assert(bitmaskBn.toString(16).toLowerCase() === accuFromString.toHex().toLowerCase().slice(2), "BN hex value and bitmask string constructed value do not match");
    assert(padBitString(bitmaskString) === bitmask.toBitString(), "Conversion to 0/1 bitstring does not work");
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
      assert(padBitString(bitmaskString) === bitmask.toBitString(), "Conversion to 0/1 bitstring does not work");
    }
  });

  it(`Should identify missing bits`, async function () {
    let sequence0 = "01101011";
    let sequence1 = "1011001";
    assert(sequence0.length >= sequence1.length, "Sequence0 must not be shorter than sequence1")
    let bitmask = BitmaskAccumulator.fromBitString(sequence0);

    let indices0 = bitmask.missingIndices(BitmaskAccumulator.fromBitString(sequence1).toHex());
    let indices1 = [];
    for (let i = 0; i < sequence0.length; i++) {
      if (i >= sequence1.length) continue;
      if (sequence1[i] === "1" && sequence0[i] === "0") {
        indices1.push(i)
      }
    }
    // console.log("------------")
    // console.log(indices0)
    // console.log(indices1)
    assert(indices0.length === indices1.length, "Missing indices lists should be of the same length")
    for (let i = 0; i < indices0.length; i++) {
      assert(indices0[i] === indices1[i], `Indices do not match at index ${i}, values ${indices0[i]} != ${indices1[i]}`)
    }
  });


  it(`Should identify missing bits for different random ranges`, async function () {
    for (let n = 0; n < N_MAX_MISSING; n++) {
      for (let r = 0; r < N_REPEAT_MISSING; r++) {
        let sequence0 = randomBitSequence(n)
        let sequence1 = randomBitSequence(n, false, Math.random() / (2 * RAND_OFFSET) + (0.5 - RAND_OFFSET));
        assert(sequence0.length >= sequence1.length, "Sequence0 must not be shorter than sequence1")
        let bitmask = BitmaskAccumulator.fromBitString(sequence0);
        let indices0 = bitmask.missingIndices(BitmaskAccumulator.fromBitString(sequence1).toHex());
        let indices1 = [];
        for (let i = 0; i < sequence0.length; i++) {
          if (i >= sequence1.length) continue;
          if (sequence1[i] === "1" && sequence0[i] === "0") {
            indices1.push(i)
          }
        }
        // console.log("------------")
        // console.log(indices0)
        // console.log(indices1)

        assert(indices0.length === indices1.length, "Missing indices lists should be of the same length")
        for (let i = 0; i < indices0.length; i++) {
          assert(indices0[i] === indices1[i], `Indices do not match at index ${i}, values ${indices0[i]} != ${indices1[i]}`)
        }
      }
    }
  });

  it(`Should correctly extract indices`, async function () {
    let sequence = "1001101";
    let indices0 = [];
    for(let i = 0; i < sequence.length; i++) {
      if(sequence[i] === "1") {
        indices0.push(i);
      }
    }
    let indices1 = BitmaskAccumulator.fromBitString(sequence).toIndices(sequence.length);
    assert(indices0.length === indices1.length, "Missing indices lists should be of the same length")
    for (let i = 0; i < indices0.length; i++) {
      assert(indices0[i] === indices1[i], `Indices do not match at index ${i}, values ${indices0[i]} != ${indices1[i]}`)
    }
  });

  it(`Should correctly extract indices for random data`, async function () {
    for (let n = 0; n < N_MAX_INDICES; n++) {
      for (let r = 0; r < N_REPEAT_INDICES; r++) {
        let sequence = randomBitSequence(n)
        let indices0 = [];
        for (let i = 0; i < sequence.length; i++) {
          if (sequence[i] === "1") {
            indices0.push(i);
          }
        }
        let indices1 = BitmaskAccumulator.fromBitString(sequence).toIndices(sequence.length);
        assert(indices0.length === indices1.length, "Missing indices lists should be of the same length")
        for (let i = 0; i < indices0.length; i++) {
          assert(indices0[i] === indices1[i], `Indices do not match at index ${i}, values ${indices0[i]} != ${indices1[i]}`)
        }
      }
    }
  });

  it(`Should initialization from Hex work`, async function () {
    let hex = "0xab12cd4f";
    let bitmask = BitmaskAccumulator.fromHex(hex);
    assert(bitmask.toHex() === hex, "Hex values do not match");
  });    

  it(`Should correctly calculate if it has active bits beyond for short sequence`, async function () {
    let sequence = "100001";
    let bitmask = BitmaskAccumulator.fromBitString(sequence);
    
    assert(bitmask.hasActiveBitsBeyond(0) === true, "Should have active bit");
    assert(bitmask.hasActiveBitsBeyond(2) === true, "Should have active bit");
    assert(bitmask.hasActiveBitsBeyond(5) === true, "Should have active bit");
    assert(bitmask.hasActiveBitsBeyond(6) === false, "Should not have active bit");
  });    

  it(`Should correctly calculate if it has active bits beyond for longer sequence`, async function () {
    let sequence = "10000101 00111001 0010000".replace(/ /g, "");
    let bitmask = BitmaskAccumulator.fromBitString(sequence);
    
    assert(bitmask.hasActiveBitsBeyond(6) === true, "Should have active bit");
    assert(bitmask.hasActiveBitsBeyond(10) === true, "Should have active bit");
    assert(bitmask.hasActiveBitsBeyond(18) === true, "Should have active bit");
    assert(bitmask.hasActiveBitsBeyond(19) === false, "Should not have active bit");
  });    

});

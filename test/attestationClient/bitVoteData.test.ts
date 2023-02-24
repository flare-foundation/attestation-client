// yarn test test/attestationClient/bitVoteData.test.ts

import { expect, assert } from "chai";
import { BitVoteData } from "../../src/attester/BitVoteData";
import { getTestFile } from "../test-utils/test-utils";
import { createBlankBitVoteEvent } from "./utils/createEvents";

describe(`bitVote Data (${getTestFile(__filename)})`, function () {
  const bitVote = "0x05fakeBitVote";

  const event = createBlankBitVoteEvent(bitVote);

  const bitVoteData = new BitVoteData(event);

  it("Should construct bitVoteData", function () {
    assert(bitVoteData);
  });

  it("Should get bitVote", function () {
    expect(bitVoteData.bitVote).to.eq("0xfakeBitVote");
  });

  it("Should roundCheck", function () {
    const res = bitVoteData.roundCheck(261);
    assert(res);
  });

  it("Should throw error if to short bit vote", function () {
    const bitVote = "0x1";
    const event = createBlankBitVoteEvent(bitVote);
    expect(() => new BitVoteData(event)).to.throw("Incorrect bit vote");
  });

  it("Should create empty data", function () {
    const data = new BitVoteData(undefined);
    assert(data);

    const res = data.bitVote;
    expect(res).to.eq("0x00");

    assert(!data.roundCheck(123));
  });
});

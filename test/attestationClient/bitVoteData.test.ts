import { expect, assert } from "chai";
import { BitVoteData } from "../../src/attester/BitVoteData";
import { getTestFile } from "../test-utils/test-utils";

describe(`bitVote Data (${getTestFile(__filename)})`, function () {
  const bitVote = "0x05fakeBitVote";

  const event = { event: "BitVote", returnValues: { sender: "0xfakeSender", timestamp: 10, data: bitVote } };

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
});

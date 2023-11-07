// yarn test test/utils/EpochSettings.test.ts

import { assert, expect } from "chai";
import { EpochSettings } from "../../src/utils/data-structures/EpochSettings";
import { getTestFile } from "../test-utils/test-utils";

describe(`EpochSettings (${getTestFile(__filename)})`, () => {
  const START_TIME_SEC = 15;
  const EPOCH_DURATION = 80;
  const BIT_VOTE_DEADLINE = 40;
  let epochSettings = new EpochSettings(BigInt(START_TIME_SEC), BigInt(EPOCH_DURATION), BigInt(BIT_VOTE_DEADLINE));
  let epochLength = 80000;
  let startTime = 15000;

  it("Should get epoch Length in ms", () => {
    expect(epochSettings.getEpochLengthMs()).to.be.deep.eq(BigInt(epochLength));
  });

  it("Should get epoch id  for a given time", () => {
    for (let j = 0; j < 25; j++) {
      assert(epochSettings.getEpochIdForTime(BigInt(16000 + epochLength * j)) == j);
    }
  });
  it("Should get current epoch id", () => {
    assert(epochSettings.getCurrentEpochId() > BigInt(20833690));
  });
  it("Should get RoundIdTimeStart in ms", () => {
    for (let j = 0; j < 25; j++) {
      expect(epochSettings.getRoundIdTimeStartMs(j + 100)).to.equal(BigInt(epochLength * (j + 100) + startTime));
    }
  });

  it("Should get EpochIdTimeEnd in ms", () => {
    for (let j = 0; j < 25; j++) {
      expect(epochSettings.getEpochIdTimeEndMs(j + 100)).to.equal(BigInt(epochLength * (j + 101) + startTime));
    }
  });

  it("Should RoundIdRevealTimeStart in ms", () => {
    for (let j = 0; j < 25; j++) {
      expect(epochSettings.getRoundIdRevealTimeStartMs(j + 100)).to.equal(BigInt(epochLength * (j + 102) + startTime));
    }
  });

  it("Should correctly return epochId for voting deadline", () => {
    let epochId = 10;
    let calculatedEpochId0 = epochSettings.getEpochIdForBitVoteTimeSec(START_TIME_SEC + epochId * EPOCH_DURATION + Math.floor(BIT_VOTE_DEADLINE * 0.5));
    let calculatedEpochId1 = epochSettings.getEpochIdForBitVoteTimeSec(START_TIME_SEC + epochId * EPOCH_DURATION + Math.floor(BIT_VOTE_DEADLINE * 1.5));
    expect(calculatedEpochId0).to.equal(epochId);
    expect(calculatedEpochId1).to.be.undefined;
  });

  it("Should get getBitVoteDurationMs", function () {
    const res = epochSettings.getBitVoteDurationMs();
    expect(res).to.eq(BigInt(40000));
  });

  it("Should not get getBitVoteDurationMs", function () {
    let epochSettings2 = new EpochSettings(BigInt(START_TIME_SEC), BigInt(EPOCH_DURATION));

    const res = epochSettings2.getBitVoteDurationMs();
    expect(res).to.eq(0n);
  });
});

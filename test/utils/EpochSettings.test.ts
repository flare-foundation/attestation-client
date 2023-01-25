import { toBN } from "@flarenetwork/mcc";
import { assert, expect } from "chai";
import { EpochSettings } from "../../src/utils/EpochSettings";
import { getTestFile } from "../test-utils/test-utils";

describe(`EpochSettings (${getTestFile(__filename)})`, () => {
  const START_TIME_SEC = 15;
  const EPOCH_DURATION = 80;
  const BIT_VOTE_DEADLINE = 40;
  let epochSettings = new EpochSettings(toBN(START_TIME_SEC), toBN(EPOCH_DURATION), toBN(BIT_VOTE_DEADLINE));
  let epochLength = 80000;
  let startTime = 15000;

  it("Should get epoch Length in ms", () => {
    expect(epochSettings.getEpochLengthMs()).to.be.deep.eq(toBN(epochLength));
  });

  it("Should get epoch id  for a given time", () => {
    for (let j = 0; j < 25; j++) {
      assert(epochSettings.getEpochIdForTime(toBN(16000 + epochLength * j)).eq(toBN(j)));
    }
  });
  it("Should get current epoch id", () => {
    assert(epochSettings.getCurrentEpochId().gt(toBN(20833690)));
  });
  it("Should get RoundIdTimeStart in ms", () => {
    for (let j = 0; j < 25; j++) {
      expect(epochSettings.getRoundIdTimeStartMs(j + 100)).to.equal(epochLength * (j + 100) + startTime);
    }
  });

  it("Should get EpochIdTimeEnd in ms", () => {
    for (let j = 0; j < 25; j++) {
      expect(epochSettings.getEpochIdTimeEndMs(j + 100)).to.equal(epochLength * (j + 101) + startTime);
    }
  });

  it("Should RoundIdRevealTimeStart in ms", () => {
    for (let j = 0; j < 25; j++) {
      expect(epochSettings.getRoundIdRevealTimeStartMs(j + 100)).to.equal(epochLength * (j + 102) + startTime);
    }
  });

  it("Should correctly return epochId for voting deadline", () => {
    let epochId = 10;
    let calculatedEpochId0 = epochSettings.getEpochIdForBitVoteTimeSec(START_TIME_SEC + epochId * EPOCH_DURATION + Math.floor(BIT_VOTE_DEADLINE * 0.5));
    let calculatedEpochId1 = epochSettings.getEpochIdForBitVoteTimeSec(START_TIME_SEC + epochId * EPOCH_DURATION + Math.floor(BIT_VOTE_DEADLINE * 1.5));
    expect(calculatedEpochId0).to.equal(epochId);
    expect(calculatedEpochId1).to.be.undefined;
  });

});

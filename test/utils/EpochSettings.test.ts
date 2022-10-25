import { toBN, toNumber } from "@flarenetwork/mcc";
import { assert, expect } from "chai";
import { EpochSettings } from "../../lib/utils/EpochSettings";

describe("EpochSettings", () => {
  let epochSettings = new EpochSettings(toBN(15), toBN(80));
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

  it("Should get  EpochIdTimeEnd in ms", () => {
    for (let j = 0; j < 25; j++) {
      expect(epochSettings.getEpochIdTimeEndMs(j + 100)).to.equal(epochLength * (j + 101) + startTime);
    }
  });

  it("Should get RoundIdtCommitTimeStart in ms", () => {
    for (let j = 0; j < 25; j++) {
      expect(epochSettings.getRoundIdCommitTimeStartMs(j + 100)).to.equal(epochLength * (j + 101) + startTime);
    }
  });
  it("Should RoundIdtRevealTimeStart in ms", () => {
    for (let j = 0; j < 25; j++) {
      expect(epochSettings.getRoundIdRevealTimeStartMs(j + 100)).to.equal(epochLength * (j + 102) + startTime);
    }
  });
});

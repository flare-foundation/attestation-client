import { assert } from "chai";
import { getTimeSec, getTimeMilli } from "../../lib/utils/internetTime";

describe("Internet time", () => {
  it("Should get time in milliseconds", () => {
    const timeMil = getTimeMilli();
    assert(timeMil > 1666622201459);
  });

  it("Should get time in seconds", () => {
    const timeSec = getTimeSec();
    assert(timeSec > 1666622201);
  });
});

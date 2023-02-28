import { expect, assert } from "chai";
import { Attestation } from "../../src/attester/Attestation";
import { AttestationData } from "../../src/attester/AttestationData";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
import { createBlankAtRequestEvent } from "./utils/createEvents";

describe(`Attestation Data (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  const event = createBlankAtRequestEvent(1, 3, "0xFakeMIC", "123", "0xfakeId");

  const attData = new AttestationData(event);

  const attestation = new Attestation(14, attData);

  it("Should construct attestation", function () {
    assert(attestation);
  });

  it("Should set index", function () {
    attestation.setIndex(20);
    expect(attestation.index).to.eq(20);
  });

  it("Should get roundId", function () {
    const res = attestation.roundId;
    expect(res).to.eq(14);
  });

  it("Should set testRoundId", function () {
    attestation.setTestRoundId(35);
    const res = attestation.roundId;
    expect(res).to.eq(35);
  });
});

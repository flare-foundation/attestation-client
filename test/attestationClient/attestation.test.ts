import { expect, assert } from "chai";
import { Attestation } from "../../src/attester/Attestation";
import { AttestationData } from "../../src/attester/AttestationData";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { encodePayment } from "../../src/verification/generated/attestation-request-encode";
import { ARPayment } from "../../src/verification/generated/attestation-request-types";
import { getTestFile } from "../test-utils/test-utils";

describe(`Attestation Data (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  const arPayment: ARPayment = { attestationType: 1, sourceId: 3, inUtxo: 0, utxo: 0, id: "fakeID", messageIntegrityCode: "fakeMIC" };
  const reqData = encodePayment(arPayment);
  const event = {
    blockNumber: 10,
    logIndex: 1,
    returnValues: {
      timestamp: 123,
      data: reqData,
    },
  };
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

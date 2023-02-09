import { expect, assert } from "chai";
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

  it("Should construct Attestation Data", function () {
    assert(attData);
  });

  it("Should get id", function () {
    const res = attData.getId();
    expect(res).to.eq(event.returnValues.data);
  });
});

import { expect, assert } from "chai";
import { AttestationData } from "../../src/attester/AttestationData";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
import { createBlankAtRequestEvent } from "../attestationClient/utils/createEvents";
import { AttestationType } from "../../src/verification/generated/attestation-types-enum";
import { SourceId } from "../../src/verification/sources/sources";

describe(`Attestation Data (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  const event = createBlankAtRequestEvent(AttestationType.Payment, SourceId.XRP, 1, "0xfakeId", "123", "0xFakeMIC");

  let attData: AttestationData;

  it("Should construct Attestation Data", function () {
    attData = new AttestationData(event);
    assert(attData);
  });

  it("Should get id", function () {
    const res = attData.getId();
    expect(res).to.eq(event.returnValues.data);
  });
});

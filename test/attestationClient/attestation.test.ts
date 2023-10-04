import { expect, assert } from "chai";
import { Attestation } from "../../src/attester/Attestation";
import { AttestationData } from "../../src/attester/AttestationData";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { AttestationType } from "../../src/verification/generated/attestation-types-enum";
import { SourceId } from "../../src/verification/sources/sources";
import { getTestFile } from "../test-utils/test-utils";
import { createBlankAtRequestEvent } from "./utils/createEvents";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";

describe(`Attestation Data (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();
  let attData: AttestationData;
  let defStore: AttestationDefinitionStore;

  before(async function () {
    defStore = new AttestationDefinitionStore("configs/type-definitions");
    const event = createBlankAtRequestEvent(defStore, AttestationType.Payment, SourceId.XRP, 1, "0xFakeMIC", "123", "0xfakeId");
    attData = new AttestationData(event);
  });

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

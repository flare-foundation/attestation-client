import { expect, assert } from "chai";
import { AttestationData } from "../../src/attester/AttestationData";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
import { createBlankAtRequestEvent } from "../attestationClient/utils/createEvents";
import { AttestationType } from "../../src/verification/generated/attestation-types-enum";
import { SourceId } from "../../src/verification/sources/sources";
import { AttestationDefinitionStore } from "../../src/verification/attestation-types/AttestationDefinitionStore";
import { AttestationRequest } from "../../typechain-web3-v1/StateConnector";

describe(`Attestation Data (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();
  let defStore: AttestationDefinitionStore;
  let event: AttestationRequest;
  let attData: AttestationData;

  before(async function () {
    defStore = new AttestationDefinitionStore();
    await defStore.initialize();
    event = createBlankAtRequestEvent(defStore, AttestationType.Payment, SourceId.XRP, 1, "0xfakeId", "123", "0xFakeMIC");
  });

  it("Should construct Attestation Data", function () {
    attData = new AttestationData(event);
    assert(attData);
  });

  it("Should get id", function () {
    const res = attData.getId();
    expect(res).to.eq(event.returnValues.data);
  });
});

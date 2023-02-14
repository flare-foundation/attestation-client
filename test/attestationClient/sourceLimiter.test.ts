import { expect, assert } from "chai";
import { Attestation } from "../../src/attester/Attestation";
import { AttestationData } from "../../src/attester/AttestationData";
import { SourceLimiterConfig, SourceLimiterTypeConfig } from "../../src/attester/configs/SourceLimiterConfig";
import { SourceLimiter } from "../../src/attester/source/SourceLimiter";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { encodeReferencedPaymentNonexistence } from "../../src/verification/generated/attestation-request-encode";
import { ARReferencedPaymentNonexistence } from "../../src/verification/generated/attestation-request-types";
import { getTestFile } from "../test-utils/test-utils";
import { createBlankAtRequestEvent } from "./utils/createEvents";

describe(`SourceLimiter (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  const defTypeConfig = new SourceLimiterTypeConfig();
  defTypeConfig.weight = 10;
  const config = new SourceLimiterConfig();
  config.source = 2;
  config.maxTotalRoundWeight = 9;
  for (let type = 1; type < 3; type++) {
    config.attestationTypes.set(type, defTypeConfig);
  }

  const sourceLimiter = new SourceLimiter(config, getGlobalLogger());

  const event = createBlankAtRequestEvent(1, 3, "0xFakeMIC", "123", "0xfakeId");
  const attData = new AttestationData(event);
  const attestation = new Attestation(14, attData);

  const arRef: ARReferencedPaymentNonexistence = {
    attestationType: 15,
    sourceId: 2,
    messageIntegrityCode: "0xfakeMIC",
    minimalBlockNumber: 2,
    deadlineBlockNumber: 5,
    deadlineTimestamp: 5312,
    destinationAddressHash: "0xFakeAdress",
    amount: 100,
    paymentReference: "0xfakeref",
  };
  const reqData2 = encodeReferencedPaymentNonexistence(arRef);
  const event2 = createBlankAtRequestEvent(4, 3, "0xFakeMIC", "123", "0xfakeId");
  const attData2 = new AttestationData(event2);
  const attestation2 = new Attestation(15, attData2);

  it("Should construct sourceLimiter", function () {
    assert(sourceLimiter);
  });

  it("Should not ProceedWithValidation, invalid type", function () {
    const res = sourceLimiter.canProceedWithValidation(attestation2);
    assert(!res);
    expect(attestation2.status).to.eq(7);
  });

  it("Should ProceedWithValidation", function () {
    assert(sourceLimiter.canProceedWithValidation(attestation));
  });

  it("Should not ProceedWithValidation", function () {
    assert(!sourceLimiter.canProceedWithValidation(attestation));
    expect(attestation.status).to.eq(6);
  });
});

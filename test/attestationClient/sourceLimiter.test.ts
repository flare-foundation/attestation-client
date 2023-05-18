import { assert, expect } from "chai";
import { Attestation } from "../../src/attester/Attestation";
import { AttestationData } from "../../src/attester/AttestationData";
import { AttestationTypeConfig } from "../../src/attester/configs/AttestationTypeConfig";
import { SourceConfig } from "../../src/attester/configs/SourceConfig";
import { SourceLimiter } from "../../src/attester/source/SourceLimiter";
import { AttestationStatus } from "../../src/attester/types/AttestationStatus";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { ARReferencedPaymentNonexistence } from "../../src/verification/generated/attestation-request-types";
import { AttestationType } from "../../src/verification/generated/attestation-types-enum";
import { SourceId } from "../../src/verification/sources/sources";
import { getTestFile } from "../test-utils/test-utils";
import { createBlankAtRequestEvent } from "./utils/createEvents";
import { AttestationDefinitionStore } from "../../src/verification/attestation-types/AttestationDefinitionStore";
import { AttestationRequest } from "../../typechain-web3-v1/StateConnector";

describe(`SourceLimiter (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  const config = new SourceConfig();
  config.source = "DOGE";
  config.maxTotalRoundWeight = 9;
  for (let type of ["Payment", "BalanceDecreasingTransaction"]) {
    const defTypeConfig = new AttestationTypeConfig();
    defTypeConfig.weight = 10;
    defTypeConfig.type = type;
    config.attestationTypes.push(defTypeConfig);
  }
  config.initialize();

  const sourceLimiter = new SourceLimiter(config, getGlobalLogger());

  let event: AttestationRequest; 
  let attData: AttestationData;
  let attestation: Attestation;

  let event2: AttestationRequest; 
  let attData2: AttestationData;
  let attestation2: Attestation;

  const arRef: ARReferencedPaymentNonexistence = {
    attestationType: 15 as any,
    sourceId: 2,
    messageIntegrityCode: "0xfakeMIC",
    minimalBlockNumber: 2,
    deadlineBlockNumber: 5,
    deadlineTimestamp: 5312,
    destinationAddressHash: "0xFakeAdress",
    amount: 100,
    paymentReference: "0xfakeref",
  };

  let defStore: AttestationDefinitionStore;

  before(async function () {
    defStore = new AttestationDefinitionStore();
    await defStore.initialize();

    event = createBlankAtRequestEvent(defStore, AttestationType.Payment, SourceId.XRP, 1, "0xFakeMIC", "123", "0xfakeId");
    attData = new AttestationData(event);
    attestation = new Attestation(14, attData);

    event2 = createBlankAtRequestEvent(defStore, AttestationType.ReferencedPaymentNonexistence, SourceId.XRP, 1, "0xFakeMIC", "123", "0xfakeId");
    attData2 = new AttestationData(event2);
    attestation2 = new Attestation(15, attData2);  
  });

  it("Should construct sourceLimiter", function () {
    assert(sourceLimiter);
  });

  it("Should not ProceedWithValidation, invalid type", function () {
    const res = sourceLimiter.canProceedWithValidation(attestation2);
    assert(!res);
    expect(attestation2.status).to.eq(AttestationStatus.failed);
  });

  it("Should ProceedWithValidation", function () {
    assert(sourceLimiter.canProceedWithValidation(attestation));
  });

  it("Should not ProceedWithValidation", function () {
    assert(!sourceLimiter.canProceedWithValidation(attestation));
    expect(attestation.status).to.eq(AttestationStatus.overLimit);
  });
});

//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import {
  ARPayment,
  ARBalanceDecreasingTransaction,
  ARConfirmedBlockHeightExists,
  ARReferencedPaymentNonexistence,
} from "../../src/verification/generated/attestation-request-types";
import { AttestationType } from "../../src/verification/generated/attestation-types-enum";
import { SourceId } from "../../src/verification/sources/sources";
import { getRandomRequestForAttestationTypeAndSourceId } from "../../src/verification/generated/attestation-random-utils";
import { getTestFile } from "../test-utils/test-utils";
import { AttestationDefinitionStore } from "../../src/verification/attestation-types/AttestationDefinitionStore";

describe(`Attestestation Request Parser (${getTestFile(__filename)})`, function () {
  const defStore = new AttestationDefinitionStore();
  before(async function () {
    await defStore.initialize();
  });

  it("Should encode and decode for 'Payment'", async function () {
    for (const sourceId of [3, 0, 2]) {
      const randomRequest = getRandomRequestForAttestationTypeAndSourceId(1 as AttestationType, sourceId as SourceId) as ARPayment;

      const bytes = defStore.encodeRequest(randomRequest);
      const parsedRequest = defStore.parseRequest(bytes);
      assert(defStore.equalsRequest(randomRequest, parsedRequest));
    }
  });

  it("Should encode and decode for 'BalanceDecreasingTransaction'", async function () {
    for (const sourceId of [3, 0, 2]) {
      const randomRequest = getRandomRequestForAttestationTypeAndSourceId(2 as AttestationType, sourceId as SourceId) as ARBalanceDecreasingTransaction;

      const bytes = defStore.encodeRequest(randomRequest);
      const parsedRequest = defStore.parseRequest(bytes);
      assert(defStore.equalsRequest(randomRequest, parsedRequest));
    }
  });

  it("Should encode and decode for 'ConfirmedBlockHeightExists'", async function () {
    for (const sourceId of [3, 0, 2]) {
      const randomRequest = getRandomRequestForAttestationTypeAndSourceId(3 as AttestationType, sourceId as SourceId) as ARConfirmedBlockHeightExists;

      const bytes = defStore.encodeRequest(randomRequest);
      const parsedRequest = defStore.parseRequest(bytes);
      assert(defStore.equalsRequest(randomRequest, parsedRequest));
    }
  });

  it("Should encode and decode for 'ReferencedPaymentNonexistence'", async function () {
    for (const sourceId of [3, 0, 2]) {
      const randomRequest = getRandomRequestForAttestationTypeAndSourceId(4 as AttestationType, sourceId as SourceId) as ARReferencedPaymentNonexistence;

      const bytes = defStore.encodeRequest(randomRequest);
      const parsedRequest = defStore.parseRequest(bytes);
      assert(defStore.equalsRequest(randomRequest, parsedRequest));
    }
  });
});

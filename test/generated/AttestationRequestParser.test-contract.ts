//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import {
  ARPayment,
  ARBalanceDecreasingTransaction,
  ARConfirmedBlockHeightExists,
  ARReferencedPaymentNonexistence,
  ARTrustlineIssuance,
} from "../../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../../lib/verification/generated/attestation-types-enum";
import { SourceId } from "../../lib/verification/sources/sources";
import { getRandomRequestForAttestationTypeAndSourceId } from "../../lib/verification/generated/attestation-random-utils";
import { encodeRequest } from "../../lib/verification/generated/attestation-request-encode";
import { parseRequest } from "../../lib/verification/generated/attestation-request-parse";
import { equalsRequest } from "../../lib/verification/generated/attestation-request-equals";

describe("Attestestation Request Parser", function () {
  it("Should encode and decode for 'Payment'", async function () {
    for (let sourceId of [3, 0, 1, 2, 4]) {
      let randomRequest = getRandomRequestForAttestationTypeAndSourceId(1 as AttestationType, sourceId as SourceId) as ARPayment;

      let bytes = encodeRequest(randomRequest);
      let parsedRequest = parseRequest(bytes);
      assert(equalsRequest(randomRequest, parsedRequest));
    }
  });

  it("Should encode and decode for 'BalanceDecreasingTransaction'", async function () {
    for (let sourceId of [3, 0, 1, 2, 4]) {
      let randomRequest = getRandomRequestForAttestationTypeAndSourceId(2 as AttestationType, sourceId as SourceId) as ARBalanceDecreasingTransaction;

      let bytes = encodeRequest(randomRequest);
      let parsedRequest = parseRequest(bytes);
      assert(equalsRequest(randomRequest, parsedRequest));
    }
  });

  it("Should encode and decode for 'ConfirmedBlockHeightExists'", async function () {
    for (let sourceId of [3, 0, 1, 2, 4]) {
      let randomRequest = getRandomRequestForAttestationTypeAndSourceId(3 as AttestationType, sourceId as SourceId) as ARConfirmedBlockHeightExists;

      let bytes = encodeRequest(randomRequest);
      let parsedRequest = parseRequest(bytes);
      assert(equalsRequest(randomRequest, parsedRequest));
    }
  });

  it("Should encode and decode for 'ReferencedPaymentNonexistence'", async function () {
    for (let sourceId of [3, 0, 1, 2, 4]) {
      let randomRequest = getRandomRequestForAttestationTypeAndSourceId(4 as AttestationType, sourceId as SourceId) as ARReferencedPaymentNonexistence;

      let bytes = encodeRequest(randomRequest);
      let parsedRequest = parseRequest(bytes);
      assert(equalsRequest(randomRequest, parsedRequest));
    }
  });

  it("Should encode and decode for 'TrustlineIssuance'", async function () {
    for (let sourceId of [3]) {
      let randomRequest = getRandomRequestForAttestationTypeAndSourceId(5 as AttestationType, sourceId as SourceId) as ARTrustlineIssuance;

      let bytes = encodeRequest(randomRequest);
      let parsedRequest = parseRequest(bytes);
      assert(equalsRequest(randomRequest, parsedRequest));
    }
  });
});

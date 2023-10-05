import { assert, expect } from "chai";
import { Attestation } from "../../src/attester/Attestation";
import { AttestationData } from "../../src/attester/AttestationData";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
import { createBlankAtRequestEvent } from "./utils/createEvents";
import { ethers } from "ethers";

describe(`Attestation Data (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();
  let attData: AttestationData;
  let defStore: AttestationDefinitionStore;

  before(async function () {
    defStore = new AttestationDefinitionStore("configs/type-definitions");
    const event = createBlankAtRequestEvent(defStore, "Payment", "XRP", 1, ethers.zeroPadBytes("0x0123aa", 32), "123", ethers.zeroPadBytes("0x1d1d1d", 32));
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

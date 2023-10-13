import { assert, expect } from "chai";
import { AttestationData } from "../../src/attester/AttestationData";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { AttestationRequest } from "../../typechain-web3-v1/StateConnector";
import { createBlankAtRequestEvent } from "../attestationClient/utils/createEvents";
import { getTestFile } from "../test-utils/test-utils";
import { ethers } from "ethers";

describe(`Attestation Data (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();
  let defStore: AttestationDefinitionStore;
  let event: AttestationRequest;
  let attData: AttestationData;

  before(async function () {
    defStore = new AttestationDefinitionStore("configs/type-definitions");
    event = createBlankAtRequestEvent(defStore, "Payment", "XRP", 1, ethers.zeroPadBytes("0x0123aa", 32), "123", ethers.zeroPadBytes("0x1d1d1d", 32));
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

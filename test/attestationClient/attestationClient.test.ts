// yarn test test/attestationClient/attestationClient.test.ts

import { traceManager } from "@flarenetwork/mcc";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { AttestationData } from "../../src/attester/AttestationData";
import { AttestationRoundManager } from "../../src/attester/AttestationRoundManager";
import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { SourceRouter } from "../../src/attester/source/SourceRouter";
import { setRetryFailureCallback } from "../../src/utils/helpers/promiseTimeout";
import { getGlobalLogger } from "../../src/utils/logging/logger";
import { TERMINATION_TOKEN, getTestFile } from "../test-utils/test-utils";
import { MockFlareConnection } from "./utils/mockClasses";
chai.use(chaiAsPromised);

class MockSourceRouter extends SourceRouter {
  constructor() {
    super(undefined);
  }
  // validateTransaction(sourceId: SourceId, transaction: Attestation) {}
}

describe(`Attestation Client (${getTestFile(__filename)})`, () => {
  let attestationRoundManager: AttestationRoundManager;

  //initializeTestGlobalLogger();
  const logger = getGlobalLogger();

  before(async function () {
    setRetryFailureCallback((label: string) => {
      throw new Error(TERMINATION_TOKEN);
    });

    traceManager.displayStateOnException = false;
  });

  beforeEach(async function () {
    //TestLogger.clear();

    // Reading configuration
    const config = new AttestationClientConfig();

    const flareConnection = new MockFlareConnection(config, logger);
    // const sourceRouter = new MockSourceRouter();
    attestationRoundManager = new AttestationRoundManager(config, logger, flareConnection, undefined);
    // override initially generated source router
  });

  ////////////////////////////////
  // Unit tests
  ////////////////////////////////
  it(`Create attestation sourceId and type from event`, async function () {
    const mockEvent = {
      blockNumber: 1,
      logIndex: 2,
      returnValues: {
        timestamp: 3,
        data: "0x5d0d557df9c7e2d70ac3ebe35117c25bb1ffa8873fac714dec6c4e362da8f3b6",
      },
    };

    const attestation = new AttestationData(mockEvent as any);

    expect(attestation.sourceId, "attestation.sourceId should be 1434319303").to.eq(1434319303);
    expect(attestation.type, "attestation.type should be 23821").to.eq(23821);
  });

  ////////////////////////////////
  // Integration tests
  ////////////////////////////////
  it.skip(`Attestate Valid Request`, async function () {
    const mockEvent = {
      blockNumber: 10,
      logIndex: 1,
      returnValues: {
        timestamp: 123,
        data: "0x5d0d557df9c7e2d70ac3ebe35117c25bb1ffa8873fac714dec6c4e362da8f3b6",
      },
    };

    const attestation = new AttestationData(mockEvent as any);

    await attestationRoundManager.onAttestationRequest(attestation);

    //expect(TestLogger.exists("waiting on block 70015100 to be valid"), "block should be valid at start").to.eq(false);
  });
});

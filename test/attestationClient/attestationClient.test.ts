// yarn test test/attestationClient/attestationClient.test.ts

import { traceManager } from "@flarenetwork/mcc";
import BN from "bn.js";
import { Attestation } from "../../src/attester/Attestation";
import { AttestationData } from "../../src/attester/AttestationData";
import { AttestationRoundManager } from "../../src/attester/AttestationRoundManager";
import { AttesterConfig } from "../../src/attester/AttesterConfig";
import { AttesterWeb3 } from "../../src/attester/AttesterWeb3";
import { SourceRouter } from "../../src/source/SourceRouter";
import { AttLogger, getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logger";
import { setRetryFailureCallback } from "../../src/utils/PromiseTimeout";
import { TestLogger } from "../../src/utils/testLogger";
import { SourceId } from "../../src/verification/sources/sources";
import { TERMINATION_TOKEN } from "../test-utils/test-utils";

const chai = require("chai");
const expect = chai.expect;

class MockSourceRouter extends SourceRouter {
  validateTransaction(sourceId: SourceId, transaction: Attestation) { }
}

class MockAttesterWeb3 extends AttesterWeb3 {
  constructor(config: AttesterConfig, logger: AttLogger) {
    super(config, logger);
  }

  async initialize() { }

  check(bnString: string) {
    if (bnString.length != 64 + 2 || bnString[0] !== "0" || bnString[1] !== "x") {
      this.logger.error(`invalid BN formating ${bnString}`);
    }
  }

  async submitAttestation(
    action: string,
    bufferNumber: BN,
    // commit
    commitedMerkleRoot: string,
    commitedMaskedMerkleRoot: string,
    commitedRandom: string,
    // reveal
    revealedMerkleRoot: string,
    revealedRandom: string,

    verbose = true
  ) {
    const roundId = bufferNumber.toNumber() - 1;
    this.check(commitedMerkleRoot);
    this.check(commitedMaskedMerkleRoot);
    this.check(commitedRandom);
    this.check(revealedMerkleRoot);
    this.check(revealedRandom);
  }
}

describe.skip("Attestation Client", () => {
  let attestationRoundManager: AttestationRoundManager;

  before(async function () {
    initializeTestGlobalLogger();

    setRetryFailureCallback((label: string) => {
      throw new Error(TERMINATION_TOKEN);
    });

    traceManager.displayStateOnException = false;
  });

  beforeEach(async function () {
    TestLogger.clear();

    const logger = getGlobalLogger();

    // Reading configuration
    const config = new AttesterConfig();

    const sourceRouter = new MockSourceRouter();
    const attesterWeb3 = new MockAttesterWeb3(config, logger);
    attestationRoundManager = new AttestationRoundManager(sourceRouter, config, logger, attesterWeb3);
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

    const attestation = new AttestationData(mockEvent);

    expect(attestation.sourceId, "attestation.sourceId should be 1434319303").to.eq(1434319303);
    expect(attestation.type, "attestation.type should be 23821").to.eq(23821);
  });

  ////////////////////////////////
  // Integration tests
  ////////////////////////////////
  it(`Attestate Valid Request`, async function () {
    const mockEvent = {
      blockNumber: 10,
      logIndex: 1,
      returnValues: {
        timestamp: 123,
        data: "0x5d0d557df9c7e2d70ac3ebe35117c25bb1ffa8873fac714dec6c4e362da8f3b6",
      },
    };

    const attestation = new AttestationData(mockEvent);

    await attestationRoundManager.attestate(attestation);

    expect(TestLogger.exists("waiting on block 70015100 to be valid"), "block should be valid at start").to.eq(false);
  });
});

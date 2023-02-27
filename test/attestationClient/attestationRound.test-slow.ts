// yarn test test/attestationClient/attestationRound.test-slow.ts

import { expect, assert } from "chai";
import sinon from "sinon";
import { Attestation } from "../../src/attester/Attestation";
import { AttestationRound } from "../../src/attester/AttestationRound";
import { AttesterState } from "../../src/attester/AttesterState";
import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { GlobalAttestationConfig } from "../../src/attester/configs/GlobalAttestationConfig";
import { GlobalConfigManager } from "../../src/attester/GlobalConfigManager";
import { SourceRouter } from "../../src/attester/source/SourceRouter";
import { AttestationRoundPhase, AttestationRoundStatus } from "../../src/attester/types/AttestationRoundEnums";
import { AttestationStatus } from "../../src/attester/types/AttestationStatus";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { sleepms } from "../../src/utils/helpers/utils";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { Verification, VerificationStatus } from "../../src/verification/attestation-types/attestation-types";
import { SourceId } from "../../src/verification/sources/sources";
import { getTestFile } from "../test-utils/test-utils";
import { createAttestationVerificationPair } from "./utils/createEvents";
import { MockFlareConnection } from "./utils/mockClasses";

describe(`Attestation round slow, (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  let round: AttestationRound;

  let attestationClientConfig: AttestationClientConfig;

  const dbConnectOptions = new DatabaseConnectOptions();
  const dbService = new DatabaseService(getGlobalLogger(), dbConnectOptions, "", "", true);

  const attesterState = new AttesterState(dbService);

  let activeGlobalConfig: GlobalAttestationConfig;
  let flareConnection: MockFlareConnection;

  const fakeAddresses: string[] = [];

  for (let j = 0; j < 9; j++) {
    fakeAddresses.push(`0xfakeaddress${j}`);
  }

  before(async function () {
    const CONFIG_PATH_ATTESTER = "../test/attestationClient/test-data/attester";
    process.env.TEST_CREDENTIALS = "1";
    process.env.CONFIG_PATH = CONFIG_PATH_ATTESTER;

    const attestationClientConfig = await readSecureConfig(new AttestationClientConfig(), `attester_1`);
    const globalConfigManager = new GlobalConfigManager(attestationClientConfig, getGlobalLogger());
    globalConfigManager.activeRoundId = 161;

    const sourceRouter = new SourceRouter(globalConfigManager);
    await globalConfigManager.initialize();

    activeGlobalConfig = globalConfigManager.getConfig(161);
    await dbService.connect();

    flareConnection = new MockFlareConnection(attestationClientConfig, getGlobalLogger(), true);
    flareConnection.addDefaultAddress(fakeAddresses);

    sourceRouter.initializeSources(161);
    round = new AttestationRound(161, activeGlobalConfig, getGlobalLogger(), flareConnection, attesterState, sourceRouter, attestationClientConfig);

    round.initialize();
  });

  afterEach(function () {
    sinon.restore();
  });

  after(function () {
    delete process.env.TEST_CREDENTIALS;
    delete process.env.CONFIG_PATH;
  });

  describe("verification", function () {
    function setAssignVerification(pairs: Map<string, Verification<any, any>>) {
      return async (attestation: Attestation) => {
        const verification = pairs.get(attestation.data.getId());

        if (verification) {
          return verification;
        }
        const blankVerification: Verification<any, any> = {
          status: VerificationStatus.NOT_CONFIRMED,
        };
        return blankVerification;
      };
    }

    it("should process attestations", async function () {
      const time = round.roundStartTimeMs;

      const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

      const pairsVer = new Map<string, Verification<any, any>>();
      const pariAtt = new Map<string, Attestation>();

      const pairOk = createAttestationVerificationPair("11", 161, 1, true, VerificationStatus.OK);
      pairsVer.set(pairOk.attestation.data.getId(), pairOk.verification);
      pariAtt.set(pairOk.attestation.data.getId(), pairOk.attestation);
      const pairMICFail = createAttestationVerificationPair("12", 161, 2, false, VerificationStatus.OK);
      pairsVer.set(pairMICFail.attestation.data.getId(), pairMICFail.verification);
      pariAtt.set(pairMICFail.attestation.data.getId(), pairMICFail.attestation);
      const pairVerFail = createAttestationVerificationPair("13", 161, 3, false, VerificationStatus.NOT_CONFIRMED);
      pairsVer.set(pairVerFail.attestation.data.getId(), pairVerFail.verification);
      pariAtt.set(pairVerFail.attestation.data.getId(), pairVerFail.attestation);
      const pairOk2 = createAttestationVerificationPair("14", 161, 4, true, VerificationStatus.OK);
      pairsVer.set(pairOk2.attestation.data.getId(), pairOk2.verification);
      pariAtt.set(pairOk2.attestation.data.getId(), pairOk2.attestation);

      const stub = sinon.stub(round.activeGlobalConfig.verifierRouter, "verifyAttestation").callsFake(setAssignVerification(pairsVer));
      for (let att of pariAtt.values()) {
        round.addAttestation(att);
      }
      round.addAttestation(pairOk.attestation);

      const pairInvalid = createAttestationVerificationPair("15", 161, 5, false, VerificationStatus.NON_EXISTENT_TRANSACTION);
      pairInvalid.attestation.status = AttestationStatus.failed;

      round.addAttestation(pairInvalid.attestation);

      await sleepms(200);

      expect(pairOk.attestation.status, "status ok").to.eq(AttestationStatus.valid);
      expect(pairOk.attestation.index, "index ok").to.eq(0);
      expect(round.duplicateCount, "duplicate").to.eq(1);
      expect(pairMICFail.attestation.status, "mic fail").to.eq(AttestationStatus.invalid);
      expect(pairVerFail.attestation.status, "verFail").to.eq(AttestationStatus.invalid);

      expect(round.attestationsProcessed).to.eq(5);
    });

    it("Should process with weight exceeded", async function () {
      const time = round.roundStartTimeMs;

      const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

      round.sourceLimiters.get(SourceId.XRP).config.maxTotalRoundWeight = 5;

      const pair1 = createAttestationVerificationPair("16", 161, 6, true, VerificationStatus.OK);
      const pair2 = createAttestationVerificationPair("17", 161, 7, true, VerificationStatus.OK);
      const pair3 = createAttestationVerificationPair("18", 161, 8, true, VerificationStatus.OK);
      const pair4 = createAttestationVerificationPair("19", 161, 9, true, VerificationStatus.OK);
      const pairsVer = new Map<string, Verification<any, any>>();
      pairsVer.set(pair2.attestation.data.getId(), pair2.verification);
      pairsVer.set(pair3.attestation.data.getId(), pair3.verification);
      pairsVer.set(pair4.attestation.data.getId(), pair4.verification);
      const stub = sinon.stub(round.activeGlobalConfig.verifierRouter, "verifyAttestation").callsFake(setAssignVerification(pairsVer));

      round.addAttestation(pair2.attestation);
      round.addAttestation(pair3.attestation);
      round.addAttestation(pair4.attestation);

      await sleepms(200);

      expect(pair2.attestation.status).to.eq(AttestationStatus.valid);
      expect(pair3.attestation.status).to.eq(AttestationStatus.overLimit);
      expect(pair4.attestation.status).to.eq(AttestationStatus.overLimit);
    });

    it("Should process to late attestation", async function () {
      const time = round.commitEndTimeMs + 1;

      const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

      round.sourceLimiters.get(SourceId.XRP).config.maxTotalRoundWeight = 200;

      const pair = createAttestationVerificationPair("20", 161, 10, true, VerificationStatus.OK);

      round.addAttestation(pair.attestation);

      await sleepms(100);

      expect(pair.attestation.status).to.eq(AttestationStatus.tooLate);
    });
  });

  describe("bitVoting", function () {
    it("Should start choose phase", function () {
      round.onChoosePhaseStart();
      expect(round.phase).to.equal(AttestationRoundPhase.choose);
    });

    it("Should bitVote", async function () {
      await round.onSubmitBitVote();
      expect(flareConnection.bitVotes.length).to.equal(1);
    });

    it("Should close bitVoting (without received bitvotes)", async function () {
      //Add fake bitVotes -  all the same

      for (const address of fakeAddresses) {
        round.bitVoteMap.set(address, flareConnection.bitVotes[0]);
      }

      await round.onCommitPhaseStart();

      await round.closeBitVoting();

      assert(round.attestations[0].chosen);
    });

    it("Should commit (first)", async function () {
      await round.onFirstCommit();
      expect(flareConnection.roots.length).to.eq(1);
      expect(round.attestStatus).to.eq(AttestationRoundStatus.committed);
    });

    it("Should reveal", async function () {
      round.attestStatus = AttestationRoundStatus.commitDataPrepared;
      round.onRevealPhaseStart();
      await round.onSubmitAttestation();
      expect(flareConnection.roots.length).to.eq(2);
      expect(round.attestStatus).to.eq(AttestationRoundStatus.revealed);
    });
  });
});

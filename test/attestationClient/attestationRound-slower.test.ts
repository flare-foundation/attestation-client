// yarn test test/attestationClient/attestationRound.test-slow.ts

import { assert, expect } from "chai";
import { ethers } from "ethers";
import sinon from "sinon";
import { Attestation } from "../../src/attester/Attestation";
import { AttestationRound } from "../../src/attester/AttestationRound";
import { AttesterState } from "../../src/attester/AttesterState";
import { GlobalConfigManager } from "../../src/attester/GlobalConfigManager";
import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { GlobalAttestationConfig } from "../../src/attester/configs/GlobalAttestationConfig";
import { SourceRouter } from "../../src/attester/source/SourceRouter";
import { AttestationRoundPhase, AttestationRoundStatus } from "../../src/attester/types/AttestationRoundEnums";
import { AttestationStatus } from "../../src/attester/types/AttestationStatus";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../src/external-libs/AttestationResponse";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { sleepMs } from "../../src/utils/helpers/utils";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { toHex } from "../../src/verification/attestation-types/attestation-types-helpers";
import { getTestFile } from "../test-utils/test-utils";
import { createAttestationVerificationPair } from "./utils/createEvents";
import { MockFlareConnection } from "./utils/mockClasses";

describe(`Attestation round slow, (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  let round: AttestationRound;

  let fakeEmptyRound: AttestationRound;

  let fakeEmptyRoundAlt: AttestationRound;
  let fakeEmptyRoundFin: AttestationRound;

  const dbConnectOptions = new DatabaseConnectOptions();
  const dbService = new DatabaseService(getGlobalLogger(), dbConnectOptions, "", "", true);

  const attesterState = new AttesterState(dbService);

  let activeGlobalConfig: GlobalAttestationConfig;
  let flareConnection: MockFlareConnection;

  let globalConfigManager: GlobalConfigManager;

  let defStore: AttestationDefinitionStore;

  const fakeAddresses: string[] = [];

  for (let j = 0; j < 9; j++) {
    fakeAddresses.push(`0xfakeaddress${j}`);
  }

  before(async function () {
    const CONFIG_PATH_ATTESTER = "./test/attestationClient/test-data";
    process.env.TEST_CREDENTIALS = "1";
    process.env.SECURE_CONFIG_PATH = CONFIG_PATH_ATTESTER;

    defStore = new AttestationDefinitionStore("configs/type-definitions");
    const attestationClientConfig = await readSecureConfig(new AttestationClientConfig(), `attester_1`);
    globalConfigManager = new GlobalConfigManager(attestationClientConfig, getGlobalLogger());
    globalConfigManager.activeRoundId = 161;

    const sourceRouter = new SourceRouter(globalConfigManager);
    await globalConfigManager.initialize();

    activeGlobalConfig = globalConfigManager.getGlobalConfig(161);
    await dbService.connect();

    flareConnection = new MockFlareConnection(attestationClientConfig, getGlobalLogger(), true);
    flareConnection.addDefaultAddress(fakeAddresses);

    sourceRouter.initializeSourcesForRound(161);
    round = new AttestationRound(161, activeGlobalConfig, getGlobalLogger(), flareConnection, attesterState, sourceRouter, attestationClientConfig);

    await round.initialize();

    fakeEmptyRound = new AttestationRound(1670, activeGlobalConfig, getGlobalLogger(), flareConnection, attesterState, sourceRouter, attestationClientConfig);
    fakeEmptyRoundAlt = new AttestationRound(
      1672,
      activeGlobalConfig,
      getGlobalLogger(),
      flareConnection,
      attesterState,
      sourceRouter,
      attestationClientConfig
    );
    fakeEmptyRoundFin = new AttestationRound(
      1671,
      activeGlobalConfig,
      getGlobalLogger(),
      flareConnection,
      attesterState,
      sourceRouter,
      attestationClientConfig
    );

    await round.initialize();
    await fakeEmptyRound.initialize();
    await fakeEmptyRoundAlt.initialize();
  });

  afterEach(function () {
    sinon.restore();
  });

  after(function () {
    delete process.env.TEST_CREDENTIALS;
    delete process.env.SECURE_CONFIG_PATH;
  });

  describe("verification", function () {
    function setAssignVerification(pairs: Map<string, AttestationResponse<any>>) {
      return async (attestation: Attestation) => {
        const verification = pairs.get(attestation.data.request);

        if (verification) {
          return verification;
        }
        const blankVerification: AttestationResponse<any> = {
          status: AttestationResponseStatus.INVALID,
        };
        return blankVerification;
      };
    }

    it("should process attestations", async function () {
      const time = Number(round.roundStartTimeMs);

      const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

      const pairsVer = new Map<string, AttestationResponse<any>>();
      const pariAtt = new Map<string, Attestation>();

      const pairOk = createAttestationVerificationPair(defStore, ethers.zeroPadBytes("0x11", 32), 161, 1, true, AttestationResponseStatus.VALID);
      pairsVer.set(pairOk.attestation.data.request, pairOk.verification);
      pariAtt.set(pairOk.attestation.data.request, pairOk.attestation);
      const pairMICFail = createAttestationVerificationPair(defStore, ethers.zeroPadBytes("0x12", 32), 161, 2, false, AttestationResponseStatus.VALID);
      pairsVer.set(pairMICFail.attestation.data.request, pairMICFail.verification);
      pariAtt.set(pairMICFail.attestation.data.request, pairMICFail.attestation);
      const pairVerFail = createAttestationVerificationPair(defStore, ethers.zeroPadBytes("0x13", 32), 161, 3, false, AttestationResponseStatus.INVALID);
      pairsVer.set(pairVerFail.attestation.data.request, pairVerFail.verification);
      pariAtt.set(pairVerFail.attestation.data.request, pairVerFail.attestation);
      const pairOk2 = createAttestationVerificationPair(defStore, ethers.zeroPadBytes("0x14", 32), 161, 4, true, AttestationResponseStatus.VALID);
      pairsVer.set(pairOk2.attestation.data.request, pairOk2.verification);
      pariAtt.set(pairOk2.attestation.data.request, pairOk2.attestation);

      // const stub = sinon.stub(round.activeGlobalConfig.verifierRouter, "verifyAttestation").callsFake(setAssignVerification(pairsVer));
      const verifierRouter = globalConfigManager.getVerifierRouter(round.roundId);
      const stub = sinon.stub(verifierRouter, "verifyAttestation").callsFake(setAssignVerification(pairsVer));
      for (let att of pariAtt.values()) {
        round.addAttestation(att);
      }
      round.addAttestation(pairOk.attestation);
      const pairInvalid = createAttestationVerificationPair(defStore, ethers.zeroPadBytes("0x15", 32), 161, 5, false, AttestationResponseStatus.INDETERMINATE);
      pairInvalid.attestation.status = AttestationStatus.failed;

      round.addAttestation(pairInvalid.attestation);

      await sleepMs(200);

      expect(pairOk.attestation.status, "status ok").to.eq(AttestationStatus.valid);
      // expect(pairOk.attestation.index, "index ok").to.eq(0);
      expect(round.duplicateCount, "duplicate").to.eq(1);
      expect(pairMICFail.attestation.status, "mic fail").to.eq(AttestationStatus.invalid);
      expect(pairVerFail.attestation.status, "verFail").to.eq(AttestationStatus.invalid);

      expect(round.attestationsProcessed).to.eq(6);
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

    it("Should close bitVoting", async function () {
      //Add fake bitVotes -  all the same

      for (const address of fakeAddresses) {
        round.bitVoteMap.set(address, flareConnection.bitVotes[0]);
      }

      await round.onCommitPhaseStart();

      await round.closeBitVoting();

      assert(round.attestations[0].chosen);
    });
  });

  describe("Commits", function () {
    it("Should prepare commit data twice", async function () {
      round.attestStatus = AttestationRoundStatus.commitDataPrepared;
      await round.tryPrepareCommitData();
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

  describe("Make empty round", function () {
    it("Should create empty round if no valid attestation", async function () {
      fakeEmptyRound.attestStatus = AttestationRoundStatus.bitVotingClosed;
      fakeEmptyRound.phase = AttestationRoundPhase.commit;

      fakeEmptyRound.tryCalculateBitVotingResults();

      await fakeEmptyRound.tryPrepareCommitData();

      expect(fakeEmptyRound.roundMerkleRoot).to.eq(toHex(0, 32));
    });

    it("Should commit empty round if can't commit", async function () {
      await fakeEmptyRoundAlt.onFirstCommit();
      expect(fakeEmptyRoundAlt.roundMerkleRoot).to.equal(toHex(0, 32));
    });

    it("Should not commit consecutive empty round", async function () {
      fakeEmptyRoundFin.attestStatus = AttestationRoundStatus.bitVotingClosed;
      fakeEmptyRoundFin.phase = AttestationRoundPhase.commit;

      fakeEmptyRoundFin.tryCalculateBitVotingResults();

      await fakeEmptyRoundFin.tryPrepareCommitData();
      fakeEmptyRoundFin.phase = AttestationRoundPhase.reveal;

      fakeEmptyRoundFin.prevRound = fakeEmptyRound;
      fakeEmptyRoundFin.nextRound = fakeEmptyRoundAlt;

      await fakeEmptyRoundFin.onSubmitAttestation();
      expect(fakeEmptyRoundFin.attestStatus).to.equal(AttestationRoundStatus.revealed);
    });
  });

  it("Should announce round finalization", function () {
    round.onFinalisePhaseStart();
    expect(round.phase).to.eq(AttestationRoundPhase.finalise);
  });
});

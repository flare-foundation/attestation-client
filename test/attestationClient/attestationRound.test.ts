// yarn test test/attestationClient/attestationRound.test.ts

import { traceManager } from "@flarenetwork/mcc";
import { assert, expect } from "chai";
import sinon from "sinon";
import { Attestation } from "../../src/attester/Attestation";
import { AttestationData } from "../../src/attester/AttestationData";
import { AttestationRound } from "../../src/attester/AttestationRound";
import { AttesterState } from "../../src/attester/AttesterState";
import { BitVoteData } from "../../src/attester/BitVoteData";
import { GlobalConfigManager } from "../../src/attester/GlobalConfigManager";
import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { GlobalAttestationConfig } from "../../src/attester/configs/GlobalAttestationConfig";
import { SourceRouter } from "../../src/attester/source/SourceRouter";
import { AttestationRoundPhase, AttestationRoundStatus } from "../../src/attester/types/AttestationRoundEnums";
import { AttestationStatus } from "../../src/attester/types/AttestationStatus";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
import { createBlankAtRequestEvent, createBlankBitVoteEvent } from "./utils/createEvents";
import { MockFlareConnection } from "./utils/mockClasses";
import { ethers } from "ethers";

describe(`Attestation Round (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  let round: AttestationRound;

  let roundAlt: AttestationRound;

  let attestationClientConfig: AttestationClientConfig;

  let sourceRouter: SourceRouter;

  const dbConnectOptions = new DatabaseConnectOptions();
  const dbService = new DatabaseService(getGlobalLogger(), dbConnectOptions, "", "", true);

  const attesterState = new AttesterState(dbService);

  let activeGlobalConfig: GlobalAttestationConfig;

  let defStore: AttestationDefinitionStore;

  before(async function () {
    traceManager.displayStateOnException = false;
    const CONFIG_PATH_ATTESTER = "./test/attestationClient/test-data";
    process.env.TEST_CREDENTIALS = "1";
    process.env.SECURE_CONFIG_PATH = CONFIG_PATH_ATTESTER;

    const attestationClientConfig = await readSecureConfig(new AttestationClientConfig(), `attester_1`);
    const globalConfigManager = new GlobalConfigManager(attestationClientConfig, getGlobalLogger());
    globalConfigManager.activeRoundId = 160;

    sourceRouter = new SourceRouter(globalConfigManager);
    await globalConfigManager.initialize();

    activeGlobalConfig = globalConfigManager.getGlobalConfig(160);
    await dbService.connect();

    let flareConnection = new MockFlareConnection(attestationClientConfig, getGlobalLogger());

    flareConnection.addDefaultAddress(["0x1fakeaddress"]);
    sourceRouter.initializeSourcesForRound(160);
    round = new AttestationRound(160, activeGlobalConfig, getGlobalLogger(), flareConnection, attesterState, sourceRouter, attestationClientConfig);

    roundAlt = new AttestationRound(180, activeGlobalConfig, getGlobalLogger(), flareConnection, attesterState, sourceRouter, attestationClientConfig);

    await roundAlt.initialize();

    defStore = new AttestationDefinitionStore("configs/type-definitions");
  });

  afterEach(function () {
    sinon.restore();
  });

  it("Should construct attestation round", function () {
    assert(round);
  });

  it("Should initialize round", async function () {
    await round.initialize();

    assert(round._initialized);
    expect(round.defaultSetAddresses.length).to.eq(1);
  });

  it("Should not initialize round twice ", async function () {
    await round.initialize();

    assert(round._initialized);
    expect(round.defaultSetAddresses.length).to.eq(1);
  });

  it("Should get round times", function () {
    const chooseWindowDurationMs = round.chooseWindowDurationMs;
    expect(chooseWindowDurationMs, "chooseWindowDurationMs").to.eq(45000n);

    const windowDurationMs = round.windowDurationMs;
    expect(windowDurationMs, "windowDurationMs").to.eq(90000n);

    const forceCloseBitVotingOffsetMs = round.forceCloseBitVotingOffsetMs;
    expect(forceCloseBitVotingOffsetMs, "forceCloseBitVotingOffsetMs").to.equal(2000n);

    const roundStartTimeMs = round.roundStartTimeMs;
    expect(roundStartTimeMs, "roundStartTimeMs").to.eq(123n * 1000n + 160n * 90n * 1000n);

    const roundChooseStartTimeMs = round.roundChooseStartTimeMs;
    expect(roundChooseStartTimeMs, "roundChooseStartTimeMs").to.eq(123n * 1000n + 161n * 90n * 1000n);

    const roundBitVoteTimeMs = round.roundBitVoteTimeMs;
    expect(roundBitVoteTimeMs, "roundBitVoteTimeMs").to.eq(BigInt(123 * 1000 + 161 * 90 * 1000 + 45000 - 3000));

    const roundForceCloseBitVotingTimeMs = round.roundForceCloseBitVotingTimeMs;
    expect(roundForceCloseBitVotingTimeMs, "roundForceCloseBitVotingTimeMs").to.eq(BigInt(123 * 1000 + 161 * 90 * 1000 + 47000));

    const roundCommitStartTimeMs = round.roundCommitStartTimeMs;
    expect(roundCommitStartTimeMs, "roundCommitStartTimeMs").to.eq(BigInt(123 * 1000 + 161 * 90 * 1000 + 45000));

    const roundRevealStartTimeMs = round.roundRevealStartTimeMs;
    expect(roundRevealStartTimeMs, "roundRevealStartTimeMs").to.eq(BigInt(123 * 1000 + 162 * 90 * 1000));

    const commitEndTimeMs = round.commitEndTimeMs;
    expect(commitEndTimeMs, "commitEndTimeMs").to.eq(BigInt(123 * 1000 + 162 * 90 * 1000 - 3000));

    const roundCompleteTimeMs = round.roundCompleteTimeMs;
    expect(roundCompleteTimeMs, "roundCompleteTimeMs").to.eq(BigInt(123 * 1000 + 163 * 90 * 1000));
  });

  it("Should write label", function () {
    const clock = sinon.useFakeTimers({ now: 23000100 });

    const res = round.label;
    expect(res).to.equal("#[1] 160:8477.1/90");
  });

  describe("BitVote registering", function () {
    it("Should not register bitVote for non-default set", function () {
      const event = createBlankBitVoteEvent("0x05fakeBitVote");
      const bitVoteData = new BitVoteData(event);

      round.registerBitVote(bitVoteData);
      expect(round.bitVoteMap.keys.length).to.eq(0);
    });

    it("Should register bitVote for non-default set", function () {
      round.defaultSetAddresses.push("0xfakedefault");
      const event = createBlankBitVoteEvent("0x05fakeBitVote");
      event.returnValues.sender = "0xfakeDefault";
      const bitVoteData = new BitVoteData(event);

      round.registerBitVote(bitVoteData);
      expect(round.bitVoteMap.get("0xfakedefault")).to.eq("0xfakeBitVote");
    });
  });

  describe("Bit Voting", function () {
    it("Should mask nonexisting bitVote", function () {
      sinon.stub(console, "error");
      sinon.stub(console, "log");

      assert.throws(() => round.bitVoteMaskWithRoundCheck, "OutsideError");
    });

    it("Should create empty bitVote", function () {
      const vote = round.bitVoteAccumulator;
      expect(vote.length).to.eq(0);
    });

    it("Should create bitVote", function () {
      for (let j = 1; j < 6; j++) {
        const fakeMic = `0x0123aaa${j}`.length % 2 == 0 ? `0x0123aaa${j}` : `0x0123aaa${j}0`;
        const fakeId = `0x1d1d1d${j}`.length % 2 == 0 ? `0x1d1d1d${j}` : `0x1d1d1d${j}0`;
        const event = createBlankAtRequestEvent(defStore, "Payment", "DOGE", 1, ethers.zeroPadBytes(fakeMic, 32), "12345", ethers.zeroPadBytes(fakeId, 32));
        const attestation = new Attestation(160, new AttestationData(event));
        attestation.index = j - 1;
        attestation.status = j < 4 ? AttestationStatus.valid : AttestationStatus.tooLate;
        round.attestations.push(attestation);
      }
      const vote = round.bitVoteAccumulator;
      expect(vote.length).to.eq(5);
    });

    it("Should calculate bitVote", function () {
      round.defaultSetAddresses.splice(0);
      for (let j = 0; j < 9; j++) {
        const address = `0xfakeaddress${j}`;
        round.defaultSetAddresses.push(address);
        round.attestations.splice(0);
        for (let i = 1; i < 10; i++) {
          const fakeMic = `0x0123aaa${j}`.length % 2 == 0 ? `0x0123aaa${j}` : `0x0123aaa${j}0`;
          const fakeId = `0x1d1d1d${j}`.length % 2 == 0 ? `0x1d1d1d${j}` : `0x1d1d1d${j}0`;

          const event = createBlankAtRequestEvent(defStore, "Payment", "DOGE", 1, ethers.zeroPadBytes(fakeMic, 32), "12345", ethers.zeroPadBytes(fakeId, 32));
          const attestation = new Attestation(160, new AttestationData(event));
          attestation.index = i - 1;
          attestation.status = i < 5 + j ? AttestationStatus.valid : AttestationStatus.overLimit;
          round.attestations.push(attestation);
        }

        round.bitVoteRecord = round.bitVoteAccumulator.toHex();
        const bitVoteMasked = round.bitVoteMaskWithRoundCheck;
        const vote = createBlankBitVoteEvent(bitVoteMasked);
        vote.returnValues.sender = address;

        const data = new BitVoteData(vote);
        round.registerBitVote(data);
      }
      const res = round.calculateBitVotingResult(false);
      expect(res.toIndices(round.attestations.length)).to.deep.eq([0, 1, 2, 3, 4, 5, 6, 7]);
    });

    it("Should calculate inconclusive bitVote", function () {
      roundAlt.defaultSetAddresses.splice(0);
      for (let j = 0; j < 9; j++) {
        const address = `0xfakeaddress${j}`;
        roundAlt.defaultSetAddresses.push(address);
        roundAlt.attestations.splice(0);
        for (let i = 1; i < 10; i++) {
          const fakeMic = `0x0123aaa${j}`.length % 2 == 0 ? `0x0123aaa${j}` : `0x0123aaa${j}0`;
          const fakeId = `0x1d1d1d${j}`.length % 2 == 0 ? `0x1d1d1d${j}` : `0x1d1d1d${j}0`;

          const event = createBlankAtRequestEvent(defStore, "Payment", "DOGE", 1, ethers.zeroPadBytes(fakeMic, 32), "12345", ethers.zeroPadBytes(fakeId, 32));
          const attestation = new Attestation(180, new AttestationData(event));
          attestation.index = i - 1;
          attestation.status = i == j ? AttestationStatus.valid : AttestationStatus.overLimit;
          roundAlt.attestations.push(attestation);
        }

        roundAlt.bitVoteRecord = roundAlt.bitVoteAccumulator.toHex();
        const bitVoteMasked = roundAlt.bitVoteMaskWithRoundCheck;
        const vote = createBlankBitVoteEvent(bitVoteMasked);
        vote.returnValues.sender = address;

        const data = new BitVoteData(vote);
        roundAlt.registerBitVote(data);
      }
      const res = roundAlt.calculateBitVotingResult();
      expect(res.toIndices(roundAlt.attestations.length)).to.deep.eq([]);
    });

    it("Should not tryCalculateBitVotingResults after chosen status", function () {
      round.attestStatus = AttestationRoundStatus.chosen;
      round.tryCalculateBitVotingResults();
      for (let j = 0; j < 6; j++) {
        assert(!round.attestations[j].chosen);
      }
      for (let j = 6; j < 9; j++) {
        assert(!round.attestations[j].chosen);
      }
    });

    it("Should not tryCalculateBitVotingResults bitVoting is not closed", function () {
      round.phase = AttestationRoundPhase.commit;
      round.attestStatus = AttestationRoundStatus.collecting;
      round.tryCalculateBitVotingResults();
      for (let j = 0; j < 6; j++) {
        assert(!round.attestations[j].chosen);
      }
      for (let j = 6; j < 9; j++) {
        assert(!round.attestations[j].chosen);
      }
    });

    it("Should tryCalculateBitVotingResults", function () {
      round.phase = AttestationRoundPhase.commit;
      round.attestStatus = AttestationRoundStatus.bitVotingClosed;
      round.tryCalculateBitVotingResults(false);
      for (let j = 0; j < 8; j++) {
        assert(round.attestations[j].chosen);
      }
      for (let j = 8; j < 9; j++) {
        assert(!round.attestations[j].chosen);
      }
      expect(round.attestStatus).to.eq(AttestationRoundStatus.chosen);
    });

    it("Should calculate bitVote with more then half zero votes", function () {
      round.defaultSetAddresses.splice(0);
      for (let j = 0; j < 9; j++) {
        const address = `0xfakeaddress${j}`;
        round.defaultSetAddresses.push(address);
        round.attestations.splice(0);
        for (let i = 1; i < 10; i++) {
          const fakeMic = `0x0123aaa${j}`.length % 2 == 0 ? `0x0123aaa${j}` : `0x0123aaa${j}0`;
          const fakeId = `0x1d1d1d${j}`.length % 2 == 0 ? `0x1d1d1d${j}` : `0x1d1d1d${j}0`;

          const event = createBlankAtRequestEvent(defStore, "Payment", "DOGE", 1, ethers.zeroPadBytes(fakeMic, 32), "12345", ethers.zeroPadBytes(fakeId, 32));
          const attestation = new Attestation(160, new AttestationData(event));
          attestation.index = i - 1;
          attestation.status = AttestationStatus.overLimit;
          round.attestations.push(attestation);
        }

        round.bitVoteRecord = round.bitVoteAccumulator.toHex();
        const bitVoteMasked = round.bitVoteMaskWithRoundCheck;
        const vote = createBlankBitVoteEvent(bitVoteMasked);
        vote.returnValues.sender = address;

        const data = new BitVoteData(vote);
        round.registerBitVote(data);
      }
      const res = round.calculateBitVotingResult(true);
      expect(res.toIndices(round.attestations.length)).to.deep.eq([]);
    });
  });

  describe("SourceManager", function () {
    it("Should get max failed retries", function () {
      const sourceManager = sourceRouter.getSourceManager("BTC");

      expect(sourceManager.maxFailedRetries).to.eq(1);
    });

    it("Should get delayBeforeRetry", function () {
      const sourceManager = sourceRouter.getSourceManager("BTC");

      expect(sourceManager.delayBeforeRetryMs).to.eq(1000);
    });
  });
});

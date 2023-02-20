// yarn test test/attestationClient/attestationRound.test.ts

import { expect, assert } from "chai";
import { AttestationRound } from "../../src/attester/AttestationRound";
import { AttesterState } from "../../src/attester/AttesterState";
import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { GlobalAttestationConfig } from "../../src/attester/configs/GlobalAttestationConfig";
import { GlobalConfigManager } from "../../src/attester/GlobalConfigManager";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
import sinon from "sinon";
import { createBlankAtRequestEvent, createBlankBitVoteEvent } from "./utils/createEvents";
import { BitVoteData } from "../../src/attester/BitVoteData";
import { MockFlareConnection } from "./utils/mockClasses";
import { Attestation } from "../../src/attester/Attestation";
import { AttestationData } from "../../src/attester/AttestationData";
import { AttestationStatus } from "../../src/attester/types/AttestationStatus";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { SourceRouter } from "../../src/attester/source/SourceRouter";

describe(`Attestation Round (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  let round: AttestationRound;

  let attestationClientConfig: AttestationClientConfig;

  const dbConnectOptions = new DatabaseConnectOptions();
  const dbService = new DatabaseService(getGlobalLogger(), dbConnectOptions, "", "", true);

  const attesterState = new AttesterState(dbService);

  let activeGlobalConfig: GlobalAttestationConfig;

  before(async function () {
    const CONFIG_PATH_ATTESTER = "../test/attestationClient/test-data/attester";
    process.env.TEST_CREDENTIALS = "1";
    process.env.CONFIG_PATH = CONFIG_PATH_ATTESTER;

    const attestationClientConfig = await readSecureConfig(new AttestationClientConfig(), `attester_1`);
    const globalConfigManager = new GlobalConfigManager(attestationClientConfig, getGlobalLogger());
    globalConfigManager.activeRoundId = 160;

    const sourceRouter = new SourceRouter(globalConfigManager);
    await globalConfigManager.initialize();

    activeGlobalConfig = globalConfigManager.getConfig(160);
    await dbService.connect();

    let flareConnection = new MockFlareConnection(attestationClientConfig, getGlobalLogger());

    round = new AttestationRound(160, activeGlobalConfig, getGlobalLogger(), flareConnection, attesterState, sourceRouter, attestationClientConfig);

    round.defaultSetAddresses.push("0xfakedefault");
  });

  afterEach(function () {
    sinon.restore();
  });

  it("Should construct attestation round", function () {
    assert(round);
  });

  it("Should get round times", function () {
    const chooseWindowDurationMs = round.chooseWindowDurationMs;
    expect(chooseWindowDurationMs, "chooseWindowDurationMs").to.eq(45000);

    const windowDurationMs = round.windowDurationMs;
    expect(windowDurationMs, "windowDurationMs").to.eq(90000);

    const forceCloseBitVotingOffsetMs = round.forceCloseBitVotingOffsetMs;
    expect(forceCloseBitVotingOffsetMs, "forceCloseBitVotingOffsetMs").to.equal(2000);

    const roundStartTimeMs = round.roundStartTimeMs;
    expect(roundStartTimeMs, "roundStartTimeMs").to.eq(123 * 1000 + 160 * 90 * 1000);

    const roundChooseStartTimeMs = round.roundChooseStartTimeMs;
    expect(roundChooseStartTimeMs, "roundChooseStartTimeMs").to.eq(123 * 1000 + 161 * 90 * 1000);

    const roundBitVoteTimeMs = round.roundBitVoteTimeMs;
    expect(roundBitVoteTimeMs, "roundBitVoteTimeMs").to.eq(123 * 1000 + 161 * 90 * 1000 + 45000 - 3000);

    const roundForceCloseBitVotingTimeMs = round.roundForceCloseBitVotingTimeMs;
    expect(roundForceCloseBitVotingTimeMs, "roundForceCloseBitVotingTimeMs").to.eq(123 * 1000 + 161 * 90 * 1000 + 47000);

    const roundCommitStartTimeMs = round.roundCommitStartTimeMs;
    expect(roundCommitStartTimeMs, "roundCommitStartTimeMs").to.eq(123 * 1000 + 161 * 90 * 1000 + 45000);

    const roundRevealStartTimeMs = round.roundRevealStartTimeMs;
    expect(roundRevealStartTimeMs, "roundRevealStartTimeMs").to.eq(123 * 1000 + 162 * 90 * 1000);

    const commitEndTimeMs = round.commitEndTimeMs;
    expect(commitEndTimeMs, "commitEndTimeMs").to.eq(123 * 1000 + 162 * 90 * 1000 - 3000);

    const roundCompleteTimeMs = round.roundCompleteTimeMs;
    expect(roundCompleteTimeMs, "roundCompleteTimeMs").to.eq(123 * 1000 + 163 * 90 * 1000);
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
      const event = createBlankBitVoteEvent("0x05fakeBitVote");
      event.returnValues.sender = "0xfakeDefault";
      const bitVoteData = new BitVoteData(event);

      round.registerBitVote(bitVoteData);
      expect(round.bitVoteMap.get("0xfakedefault")).to.eq("0xfakeBitVote");
    });
  });

  describe("Bit Voting", function () {
    it("Should create empty bitVote", function () {
      const vote = round.bitVoteAccumulator;
      expect(vote.length).to.eq(0);
    });

    it("Should create bitVote", function () {
      for (let j = 1; j < 6; j++) {
        const event = createBlankAtRequestEvent(1, 2, `0xfakeMIC${j}`, "12345", `0xfakeID${j}`);
        const attestation = new Attestation(160, new AttestationData(event));
        attestation.index = j - 1;
        attestation.status = j < 4 ? AttestationStatus.valid : AttestationStatus.tooLate;
        round.attestations.push(attestation);
      }
      const vote = round.bitVoteAccumulator;
      expect(vote.length).to.eq(5);
    });
  });
});

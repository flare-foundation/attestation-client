// yarn test test/attestationClient/attestationRound.test.ts

import { expect, assert } from "chai";
import { toBN } from "web3-utils";
import { AttestationRound } from "../../src/attester/AttestationRound";
import { AttesterState } from "../../src/attester/AttesterState";
import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { GlobalAttestationConfig } from "../../src/attester/configs/GlobalAttestationConfig";
import { FlareConnection } from "../../src/attester/FlareConnection";
import { GlobalConfigManager } from "../../src/attester/GlobalConfigManager";
import { EpochSettings } from "../../src/utils/data-structures/EpochSettings";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";

describe(`Attestation Round (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  const attestationClientConfig = new AttestationClientConfig();

  const globalConfigManager = new GlobalConfigManager(attestationClientConfig, 150, getGlobalLogger());
  globalConfigManager.testing = true;

  const dbConnectOptions = new DatabaseConnectOptions();
  const dbService = new DatabaseService(getGlobalLogger(), dbConnectOptions, "", "", true);

  const epochSettings = new EpochSettings(toBN(123), toBN(90), toBN(45));
  const attesterState = new AttesterState(dbService);

  let flareConnection: FlareConnection;

  let activeGlobalConfig: GlobalAttestationConfig;

  let round: AttestationRound;

  before(async function () {
    await globalConfigManager.initialize();
    activeGlobalConfig = globalConfigManager.getConfig(160);
    await dbService.connect();

    round = new AttestationRound(160, activeGlobalConfig, getGlobalLogger(), flareConnection, attesterState, undefined, attestationClientConfig, epochSettings);
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
    expect(roundBitVoteTimeMs, "roundBitVoteTimeMs").to.eq(123 * 1000 + 161 * 90 * 1000 + 35000);

    const roundForceCloseBitVotingTimeMs = round.roundForceCloseBitVotingTimeMs;
    expect(roundForceCloseBitVotingTimeMs, "roundForceCloseBitVotingTimeMs").to.eq(123 * 1000 + 161 * 90 * 1000 + 47000);

    const roundCommitStartTimeMs = round.roundCommitStartTimeMs;
    expect(roundCommitStartTimeMs, "roundCommitStartTimeMs").to.eq(123 * 1000 + 161 * 90 * 1000 + 45000);

    const roundRevealStartTimeMs = round.roundRevealStartTimeMs;
    expect(roundRevealStartTimeMs, "roundRevealStartTimeMs").to.eq(123 * 1000 + 162 * 90 * 1000);

    const commitEndTimeMs = round.commitEndTimeMs;
    expect(commitEndTimeMs, "commitEndTimeMs").to.eq(123 * 1000 + 162 * 90 * 1000 - 10000);

    const roundCompleteTimeMs = round.roundCompleteTimeMs;
    expect(roundCompleteTimeMs, "roundCompleteTimeMs").to.eq(123 * 1000 + 163 * 90 * 1000);
  });
});

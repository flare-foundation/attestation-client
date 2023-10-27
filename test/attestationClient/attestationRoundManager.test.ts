// yarn test test/attestationClient/attestationRoundManager.test.ts

import { traceManager } from "@flarenetwork/mcc";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "ethers";
import sinon from "sinon";
import { AttestationData } from "../../src/attester/AttestationData";
import { AttestationRoundManager } from "../../src/attester/AttestationRoundManager";
import { AttesterState } from "../../src/attester/AttesterState";
import { BitVoteData } from "../../src/attester/BitVoteData";
import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { AttestationStatus } from "../../src/attester/types/AttestationStatus";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";
import { AttestationResponseStatus } from "../../src/external-libs/AttestationResponse";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
import { createAttestationVerificationPair, createBlankAtRequestEvent, createBlankBitVoteEvent } from "./utils/createEvents";
import { MockFlareConnection } from "./utils/mockClasses";

chai.use(chaiAsPromised);

describe(`Attestation Round Manager (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  let defStore: AttestationDefinitionStore;
  // TraceManager.enabled = false;
  traceManager.displayRuntimeTrace = false;
  traceManager.displayStateOnException = false;

  let attestationClientConfig: AttestationClientConfig;

  const logger = getGlobalLogger();

  let flareConnection: MockFlareConnection;

  let roundManager: AttestationRoundManager;

  const fakeAddresses: string[] = [];

  let FIRST_EPOCH_START_S: bigint;
  let EPOCH_DURATION_S: bigint;
  let BITVOTE_DURATION_S: bigint;
  const TEST_ROUND_ID = 11n;
  let TEST_START_TIME: bigint;

  for (let j = 0; j < 9; j++) {
    fakeAddresses.push(`0xfakeaddress${j}`);
  }

  before(async function () {
    const CONFIG_PATH_ATTESTER = "./test/attestationClient/test-data";
    process.env.TEST_CREDENTIALS = "1";
    process.env.SECURE_CONFIG_PATH = CONFIG_PATH_ATTESTER;

    attestationClientConfig = await readSecureConfig(new AttestationClientConfig(), `attester_1`);

    flareConnection = new MockFlareConnection(attestationClientConfig, getGlobalLogger());

    FIRST_EPOCH_START_S = flareConnection.epochSettings.firstEpochStartTimeSec();
    EPOCH_DURATION_S = flareConnection.epochSettings.epochPeriodSec();
    BITVOTE_DURATION_S = flareConnection.epochSettings.bitVoteWindowDurationSec();

    TEST_START_TIME = FIRST_EPOCH_START_S + TEST_ROUND_ID * EPOCH_DURATION_S + 1n;

    flareConnection.addDefaultAddress(fakeAddresses);

    roundManager = new AttestationRoundManager(attestationClientConfig, logger, flareConnection);
    defStore = new AttestationDefinitionStore("configs/type-definitions");
  });

  afterEach(function () {
    sinon.restore();
  });

  after(function () {
    delete process.env.TEST_CREDENTIALS;
    delete process.env.SECURE_CONFIG_PATH;
  });

  it("Should construct AttestationRoundManager", function () {
    assert(roundManager);
  });

  it("Should not get activeRoundId if not defined", function () {
    sinon.stub(console, "error");
    sinon.stub(console, "log");

    expect(() => {
      roundManager.activeRoundId;
    }).to.throw("OutsideError");
  });

  it("Should initialize AttestationRoundManager", async function () {
    const time = TEST_START_TIME * 1000n + 1n;
    const clock = sinon.useFakeTimers({ now: Number(time), shouldAdvanceTime: true });

    await roundManager.initialize();

    expect(roundManager.activeRoundId).to.eq(Number(TEST_ROUND_ID));
  });

  it("Should not initialize AttestationRoundManager twice", async function () {
    sinon.stub(console, "error");
    sinon.stub(console, "log");
    const time = Number(TEST_START_TIME * 1000n + 1n);
    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    await expect(roundManager.initialize()).to.be.eventually.rejectedWith("OutsideError");
  });

  it("Should register attestation", async function () {
    const dbConnectOptions = new DatabaseConnectOptions();
    const dbService = new DatabaseService(getGlobalLogger(), dbConnectOptions, "", "", true);
    await dbService.connect();

    const attesterState = new AttesterState(dbService);

    roundManager.attesterState = attesterState;

    const time = Number(TEST_START_TIME * 1000n + 1n);
    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    const pair = createAttestationVerificationPair(defStore, ethers.zeroPadBytes("0x11", 32), 161, 1, true, AttestationResponseStatus.VALID);
    const data = pair.attestation.data;

    data.timeStamp = TEST_START_TIME;

    await roundManager.onAttestationRequest(data);

    expect(roundManager.rounds.get(Number(TEST_ROUND_ID)).attestations.length).to.eq(1);
  });

  it("Should not register attestation", async function () {
    const dbConnectOptions = new DatabaseConnectOptions();
    const dbService = new DatabaseService(getGlobalLogger(), dbConnectOptions, "", "", true);
    await dbService.connect();

    const attesterState = new AttesterState(dbService);

    roundManager.attesterState = attesterState;

    const time = Number(TEST_START_TIME * 1000n + 1n);
    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    const pair = createAttestationVerificationPair(defStore, ethers.zeroPadBytes("0x11", 32), 161, 0, true, AttestationResponseStatus.VALID);
    const data = pair.attestation.data;
    data.timeStamp = 123n;

    await roundManager.onAttestationRequest(data);

    assert(!roundManager.rounds.get(0));
  });

  it("Should not register invalid attestation", async function () {
    const dbConnectOptions = new DatabaseConnectOptions();
    const dbService = new DatabaseService(getGlobalLogger(), dbConnectOptions, "", "", true);
    await dbService.connect();

    const attesterState = new AttesterState(dbService);

    roundManager.attesterState = attesterState;

    const time = Number(TEST_START_TIME * 1000n + 1n);
    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    const event = createBlankAtRequestEvent(defStore, "Payment", "NonExisting", 1, ethers.zeroPadBytes("0x0123aa", 32), "" + TEST_START_TIME);
    const attData = new AttestationData(event);
    await roundManager.onAttestationRequest(attData);

    expect(roundManager.rounds.get(Number(TEST_ROUND_ID)).attestations.length).to.eq(2);
    expect(roundManager.rounds.get(Number(TEST_ROUND_ID)).attestations[1].status).to.eq(AttestationStatus.failed);
  });

  it("Should register Bitvote", async function () {
    const time = Number(TEST_START_TIME * 1000n + 1n);
    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    const bitVote = `0x0${TEST_ROUND_ID.toString(16)}fakeBitVote`;

    const event = createBlankBitVoteEvent(bitVote, "" + (TEST_START_TIME + EPOCH_DURATION_S));

    const bitVoteData = new BitVoteData(event);
    bitVoteData.sender = "0xfakeaddress2";

    roundManager.onBitVoteEvent(bitVoteData);
    expect(roundManager.rounds.get(Number(TEST_ROUND_ID)).bitVoteMap.size).to.eq(1);
  });

  it("Should not register with wrong roundCheck Bitvote", async function () {
    const bitVote = `0x0${Number(TEST_ROUND_ID + 1n).toString(16)}fakeBitVote`;

    // const event = createBlankBitVoteEvent(bitVote, "1204_001");
    const event = createBlankBitVoteEvent(bitVote, "" + (TEST_START_TIME + EPOCH_DURATION_S));

    const bitVoteData = new BitVoteData(event);
    bitVoteData.sender = "0xfakeaddress3";

    roundManager.onBitVoteEvent(bitVoteData);
    expect(roundManager.rounds.get(Number(TEST_ROUND_ID)).bitVoteMap.size).to.eq(1);
  });

  it("Should not register Bitvote for undefined round", async function () {
    const time = Number(TEST_START_TIME * 1000n + 1n);

    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    const bitVote = `0x0${(TEST_ROUND_ID + 1n).toString(16)}fakeBitVote`;
    // const event = createBlankBitVoteEvent(bitVote, "1314_001");
    const event = createBlankBitVoteEvent(bitVote, "" + Number(TEST_START_TIME + 2n * EPOCH_DURATION_S));

    const bitVoteData = new BitVoteData(event);
    roundManager.onBitVoteEvent(bitVoteData);

    assert(!roundManager.rounds.get(2));
  });

  it("Should initialize try bitVote close", function () {
    const round = roundManager.rounds.get(Number(TEST_ROUND_ID));

    const spy = sinon.spy(round, "closeBitVoting");
    // roundManager.onLastFlareNetworkTimestamp(390);
    roundManager.onLastFlareNetworkTimestamp(Number(TEST_START_TIME + 2n * EPOCH_DURATION_S - 4n));
    assert(spy.called);
  });

  it("Should not initialize try bitVote close", function () {
    const round = roundManager.rounds.get(Number(TEST_ROUND_ID));

    const spy2 = sinon.spy(round, "closeBitVoting");
    // roundManager.onLastFlareNetworkTimestamp(345);
    roundManager.onLastFlareNetworkTimestamp(Number(TEST_START_TIME + EPOCH_DURATION_S + BITVOTE_DURATION_S - 4n));
    assert(!spy2.called);
  });
});

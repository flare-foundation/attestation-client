// yarn test test/attestationClient/attestationRoundManager.test.ts

import { AttestationRoundManager } from "../../src/attester/AttestationRoundManager";
import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
import { MockFlareConnection } from "./utils/mockClasses";
import chai, { expect, assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { createAttestationVerificationPair, createBlankAtRequestEvent, createBlankBitVoteEvent } from "./utils/createEvents";
import { BitVoteData } from "../../src/attester/BitVoteData";
import { VerificationStatus } from "../../src/verification/attestation-types/attestation-types";
import { toBN } from "web3-utils";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { AttesterState } from "../../src/attester/AttesterState";
import { AttestationData } from "../../src/attester/AttestationData";
import { AttestationStatus } from "../../src/attester/types/AttestationStatus";
import { AttestationRound } from "../../src/attester/AttestationRound";

chai.use(chaiAsPromised);

describe(`Attestation Round Manager (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  let attestationClientConfig: AttestationClientConfig;

  const logger = getGlobalLogger();

  let flareConnection: MockFlareConnection;

  let roundManager: AttestationRoundManager;

  const fakeAddresses: string[] = [];

  for (let j = 0; j < 9; j++) {
    fakeAddresses.push(`0xfakeaddress${j}`);
  }

  before(async function () {
    const CONFIG_PATH_ATTESTER = "../test/attestationClient/test-data/attester";
    process.env.TEST_CREDENTIALS = "1";
    process.env.CONFIG_PATH = CONFIG_PATH_ATTESTER;

    attestationClientConfig = await readSecureConfig(new AttestationClientConfig(), `attester_1`);

    flareConnection = new MockFlareConnection(attestationClientConfig, getGlobalLogger());

    flareConnection.addDefaultAddress(fakeAddresses);

    roundManager = new AttestationRoundManager(attestationClientConfig, logger, flareConnection);
  });

  afterEach(function () {
    sinon.restore();
  });

  after(function () {
    delete process.env.TEST_CREDENTIALS;
    delete process.env.CONFIG_PATH;
  });

  it("Should construct AttestationRoundManager", function () {
    assert(roundManager);
  });

  it("Should not get activeRoundId if not defined", function () {
    expect(() => {
      roundManager.activeRoundId;
    }).to.throw("OutsideError");
  });

  it("Should initialize AttestationRoundManager", async function () {
    const time = 214_001;
    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    await roundManager.initialize();

    expect(roundManager.activeRoundId).to.eq(1);
  });

  it("Should not initialize AttestationRoundManager twice", async function () {
    const time = 214_001;
    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    await expect(roundManager.initialize()).to.be.eventually.rejectedWith("OutsideError");
  });

  it("Should register Bitvote", async function () {
    const time = 214_001;
    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    const bitVote = "0x01fakeBitVote";

    const event = createBlankBitVoteEvent(bitVote, "304_001");

    const bitVoteData = new BitVoteData(event);
    bitVoteData.sender = "0xfakeaddress2";

    roundManager.onBitVoteEvent(bitVoteData);

    expect(roundManager.rounds.get(1).bitVoteMap.size).to.eq(1);
  });

  it("Should not register with wrong roundCheck Bitvote", async function () {
    const bitVote = "0x02fakeBitVote";

    const event = createBlankBitVoteEvent(bitVote, "304_001");

    const bitVoteData = new BitVoteData(event);
    bitVoteData.sender = "0xfakeaddress3";

    roundManager.onBitVoteEvent(bitVoteData);
    expect(roundManager.rounds.get(1).bitVoteMap.size).to.eq(1);
  });

  it("Should not register Bitvote for undefined round", async function () {
    const time = 214_001;
    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    const bitVote = "0x01fakeBitVote";

    const event = createBlankBitVoteEvent(bitVote, "414_001");

    const bitVoteData = new BitVoteData(event);

    roundManager.onBitVoteEvent(bitVoteData);
    assert(!roundManager.rounds.get(2));
  });

  it("Should register attestation", async function () {
    const dbConnectOptions = new DatabaseConnectOptions();
    const dbService = new DatabaseService(getGlobalLogger(), dbConnectOptions, "", "", true);
    await dbService.connect();

    const attesterState = new AttesterState(dbService);

    roundManager.attesterState = attesterState;

    const time = 214_001;
    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    const pair = createAttestationVerificationPair("11", 161, 1, true, VerificationStatus.OK);
    const data = pair.attestation.data;
    data.timeStamp = toBN(214);

    await roundManager.onAttestationRequest(data);

    expect(roundManager.rounds.get(1).attestations.length).to.eq(1);
  });

  it("Should not register attestation", async function () {
    const dbConnectOptions = new DatabaseConnectOptions();
    const dbService = new DatabaseService(getGlobalLogger(), dbConnectOptions, "", "", true);
    await dbService.connect();

    const attesterState = new AttesterState(dbService);

    roundManager.attesterState = attesterState;

    const time = 214_001;
    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    const pair = createAttestationVerificationPair("11", 161, 0, true, VerificationStatus.OK);
    const data = pair.attestation.data;
    data.timeStamp = toBN(123);

    await roundManager.onAttestationRequest(data);

    assert(!roundManager.rounds.get(0));
  });

  it("Should not register invalid attestation", async function () {
    const dbConnectOptions = new DatabaseConnectOptions();
    const dbService = new DatabaseService(getGlobalLogger(), dbConnectOptions, "", "", true);
    await dbService.connect();

    const attesterState = new AttesterState(dbService);

    roundManager.attesterState = attesterState;

    const time = 214_001;
    const clock = sinon.useFakeTimers({ now: time, shouldAdvanceTime: true });

    const event = createBlankAtRequestEvent(1, 15, "0xFakeMIC", "214");
    const attData = new AttestationData(event);
    await roundManager.onAttestationRequest(attData);

    expect(roundManager.rounds.get(1).attestations.length).to.eq(2);
    expect(roundManager.rounds.get(1).attestations[1].status).to.eq(AttestationStatus.failed);
  });

  it("Should initialize try bitVote close", function () {
    const round = roundManager.rounds.get(1);

    const spy = sinon.spy(round, "closeBitVoting");
    roundManager.onLastFlareNetworkTimestamp(390);
    assert(spy.called);
  });

  it("Should not initialize try bitVote close", function () {
    const round = roundManager.rounds.get(1);

    const spy2 = sinon.spy(round, "closeBitVoting");
    roundManager.onLastFlareNetworkTimestamp(345);

    assert(!spy2.called);
  });
});

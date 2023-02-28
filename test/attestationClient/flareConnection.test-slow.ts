// yarn test test/attestationClient/flareConnection.test-slow.ts

import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { FlareConnection } from "../../src/attester/FlareConnection";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
import chai, { expect, assert } from "chai";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { AttesterState } from "../../src/attester/AttesterState";
import { clearTestDatabases, VerifierTestSetups } from "../verification/test-utils/verifier-test-utils";
import { StateConnectorTempTran } from "../../typechain-web3-v1/StateConnectorTempTran";
import { traceManager } from "@flarenetwork/mcc";
import { BitVoting } from "../../typechain-web3-v1/BitVoting";
import sinon from "sinon";
import waitOn from "wait-on";
import * as fs from "fs";
import { getWeb3, relativeContractABIPathForContractName } from "../../src/utils/helpers/web3-utils";
import {
  assertAddressesMatchPrivateKeys,
  deployTestContracts,
  getVoterAddresses,
  selfAssignAttestationProviders,
  setIntervalMining,
} from "./utils/attestation-client-test-utils";
import { spawn } from "child_process";
import Web3 from "web3";
import { StateConnector } from "../../typechain-web3-v1/StateConnector";
import { toHex } from "../../src/verification/attestation-types/attestation-types-helpers";
import { AttesterClient } from "../../src/attester/AttesterClient";

const FIRST_BLOCK = 1;
const LAST_CONFIRMED_BLOCK = 1000;
const NUMBER_OF_CLIENTS = 9;

const CONFIG_PATH_ATTESTER = "../test/attestationClient/test-data/attester";

const RPC = "http://127.0.0.1:8545";
const STATE_CONNECTOR_ADDRESS = "0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F";
const BIT_VOTE_ADDRESS = "0x8858eeB3DfffA017D4BCE9801D340D36Cf895CCf";

// Testing modes:
// scheduler: time is managed by Scheduler
// offset: time is real, only that it is shifted in order to start everything exactly on a beginning of the
//         next buffer window on StateConnectorTempTran contract
// let TEST_MODE: "scheduler" | "offset" | "none" = "none"
// const ADDITIONAL_OFFSET_PCT = 0
const TEST_OVERRIDE_QUERY_WINDOW_IN_SEC = LAST_CONFIRMED_BLOCK - FIRST_BLOCK;

describe(`Flare Connection + Attester Client (${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();
  let web3: Web3;
  let stateConnector: StateConnectorTempTran;
  let bitVoting: BitVoting;
  let bufferWindowDurationSec: number;
  let bufferTimestampOffsetSec: number;
  let signers: string[] = [];
  let privateKeys: string[] = [];
  let childProcesses: any[] = [];

  let flareConnection: FlareConnection;
  let attClient: AttesterClient;

  before(async function () {
    // clear all test databases in './db/' folder
    clearTestDatabases();

    // setRetryFailureCallback((label: string) => {
    //   throw new Error(TERMINATION_TOKEN);
    // });

    traceManager.displayStateOnException = false;
    sinon.stub(process, "exit");

    (process.exit as any).callsFake((code) => {
      console.log(`EXIT`);
      delete process.env.TEST_CREDENTIALS;
      for (let child of childProcesses) {
        child.stdin.pause();
        child.kill();
      }
      sinon.restore();
      process.exit();
    });

    process.env.TEST_CREDENTIALS = "1";

    // Bootstrap hardhat blockchain
    let child = spawn("yarn", ["hardhat", "node"], { shell: true });
    childProcesses.push(child);
    await waitOn({ resources: [RPC] });

    // Deploy state connector and bit voting contracts (they get always deployed on the fixed addresses)
    privateKeys = JSON.parse(fs.readFileSync(`test-1020-accounts.json`).toString()).map((x) => x.privateKey);
    const PRIVATE_KEY = privateKeys[0];
    await deployTestContracts(RPC, PRIVATE_KEY);

    // connect and initialize chain for interval mining
    process.env.TEST_HARDHAT_NODE = "1"; // disable handleRevert due to bug in combination of web3.js & ganache
    web3 = getWeb3(RPC);
    await setIntervalMining(web3);

    // Initialize contracts
    const artifacts = "artifacts";
    let abiPathStateConnector = await relativeContractABIPathForContractName("StateConnectorTempTran", artifacts);
    let abiPathBitVoting = await relativeContractABIPathForContractName("BitVoting", artifacts);
    let stateConnectorABI = JSON.parse(fs.readFileSync(`${artifacts}/${abiPathStateConnector}`).toString());
    let bitVotingABI = JSON.parse(fs.readFileSync(`${artifacts}/${abiPathBitVoting}`).toString());
    stateConnector = new web3.eth.Contract(stateConnectorABI.abi, STATE_CONNECTOR_ADDRESS) as any as StateConnectorTempTran;
    bitVoting = new web3.eth.Contract(bitVotingABI.abi, BIT_VOTE_ADDRESS) as any as BitVoting;

    bufferWindowDurationSec = parseInt(await stateConnector.methods.BUFFER_WINDOW().call(), 10);
    bufferTimestampOffsetSec = parseInt(await stateConnector.methods.BUFFER_TIMESTAMP_OFFSET().call(), 10);

    // Configure finalization bot
    signers = await getVoterAddresses(NUMBER_OF_CLIENTS);
    assertAddressesMatchPrivateKeys(web3, signers, privateKeys.slice(1, NUMBER_OF_CLIENTS + 1));

    process.env.FINALIZING_BOT_PRIVATE_KEY = PRIVATE_KEY;
    process.env.FINALIZING_BOT_PUBLIC_KEY = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY).address;
    process.env.TEST_CUSTOM_SIGNERS = JSON.stringify(signers);

    // configure attestation provider addresses
    await selfAssignAttestationProviders(getGlobalLogger(), stateConnector, web3, privateKeys.slice(1, NUMBER_OF_CLIENTS + 1));

    // DO NOT CHANGE CONFIG_PATH while attester clients are running!!!
    process.env.CONFIG_PATH = CONFIG_PATH_ATTESTER;

    const attestationClientConfig = await readSecureConfig(new AttestationClientConfig(), `attester_1`);

    flareConnection = new FlareConnection(attestationClientConfig, getGlobalLogger());

    attClient = new AttesterClient(attestationClientConfig, getGlobalLogger());

    // Finalization bot
    // let finalizationPromise = runBot(STATE_CONNECTOR_ADDRESS, RPC, "temp");
    // runPromises.push(finalizationPromise);

    // // starting web server on the first node
    // if (WEB_SERVER_IN_OTHER_PROCESS) {
    //   const child = spawn("yarn", [
    //     "ts-node",
    //     "test/attestationClient/utils/runTestWebServer.ts",
    //   ], { shell: true });
    //   console.log("XXXXXX - server")
    //   childProcesses.push(child);
    // } else {
    // await bootstrapAttestationWebServer();
    // }
  });

  after(async () => {
    // await Promise.all(runPromises);
    delete process.env.TEST_CREDENTIALS;
    delete process.env.CONFIG_PATH;
    for (let child of childProcesses) {
      child.stdin.pause();
      child.kill();
    }
    sinon.restore();
  });
  it("Should construct FlareConnection", function () {
    assert(flareConnection);
  });

  it("Should construct Attester Client", function () {
    assert(attClient);
  });

  it("Should get label from Attester Client", function () {
    const res = attClient.label;
    expect(res).to.eq("[1]");
  });

  it("Should get rpc", function () {
    const rpc = flareConnection.rpc;
    assert(rpc);
  });

  it("Should get label", function () {
    const label = flareConnection.label;
    expect(label).to.eq("[1]");
  });

  it("Should set State Manager", async function () {
    const dbConnectOptions = new DatabaseConnectOptions();
    const dbService = new DatabaseService(getGlobalLogger(), dbConnectOptions, "", "", true);

    await dbService.connect();
    const attesterState = new AttesterState(dbService);
    flareConnection.setStateManager(attesterState);
    assert(flareConnection.attesterState);
  });

  it("Should initialize FlareConnection", async function () {
    await flareConnection.initialize();
    assert(flareConnection.bitVoting);
    assert(flareConnection.stateConnector);
  });

  it("Initialization should set epochSettings", function () {
    const epochSettings = flareConnection.epochSettings;
    assert(epochSettings);
    expect(epochSettings.getBitVoteDurationMs().toNumber()).to.eq(8000);
  });

  it("Should get getAttestorsForAssignors", async function () {
    const res = await flareConnection.getAttestorsForAssignors(signers);
    expect(signers[1]).to.eq(res[1]);
  });

  it("Should get null Attestor address for unknown Assignors", async function () {
    const res = await flareConnection.getAttestorsForAssignors(["0x66064b9755Ff3C26C380bE0FbE7F38dF6222BA15"]);
    expect(res[0]).to.eq(toHex(0, 20));
  });
});

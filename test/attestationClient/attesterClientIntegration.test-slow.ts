import { BtcTransaction, ChainType, prefix0x, sleepMs, traceManager, XrpTransaction } from "@flarenetwork/mcc";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { spawn } from "child_process";
import * as fs from "fs";
import sinon from "sinon";
import waitOn from "wait-on";
import Web3 from "web3";
import { Attestation } from "../../src/attester/Attestation";
import { AttesterClient } from "../../src/attester/AttesterClient";
import { runBot } from "../../src/state-collector-finalizer/state-connector-validator-bot";
import { getUnixEpochTimestamp } from "../../src/utils/helpers/utils";
import { getWeb3, relativeContractABIPathForContractName } from "../../src/utils/helpers/web3-utils";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { AttestationTypeScheme } from "../../src/verification/attestation-types/attestation-types";
import { readAttestationTypeSchemes, toHex } from "../../src/verification/attestation-types/attestation-types-helpers";
import { ARPayment } from "../../src/verification/generated/attestation-request-types";
import { BitVoting } from "../../typechain-web3-v1/BitVoting";
import { StateConnectorTempTran } from "../../typechain-web3-v1/StateConnectorTempTran";
import { firstAddressVin, firstAddressVout, testPaymentRequest } from "../indexed-query-manager/utils/indexerTestDataGenerator";
import { getTestFile } from "../test-utils/test-utils";
import {
  bootstrapTestVerifiers,
  clearTestDatabases,
  prepareAttestation,
  VerifierBootstrapOptions,
  VerifierTestSetups,
} from "../verification/test-utils/verifier-test-utils";
import {
  assertAddressesMatchPrivateKeys,
  bootstrapAttestationClient,
  bootstrapAttestationWebServer,
  deployTestContracts,
  getVoterAddresses,
  selfAssignAttestationProviders,
  setIntervalMining,
  startSimpleSpammer,
} from "./utils/attestation-client-test-utils";
chai.use(chaiAsPromised);

describe(`Attester client integration (sometimes it fails due to time uncertainty) (${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();

  // const date = new Date(2023, 2, 10, 1);
  // const time = date.getTime() + 4000;

  // sinon.useFakeTimers({ now: Date.now(), shouldAdvanceTime: true });

  let hardhatStart: number;
  let inprocessStart: number;
  let othersStart: number;
  let spammerStart: number;

  let startblock: number = getUnixEpochTimestamp();
  // find out how to fix starting time
  //sinon.useFakeTimers({ now: 1678117529082, shouldAdvanceTime: true });

  const NUMBER_OF_CONFIRMATIONS_XRP = 1;
  const NUMBER_OF_CONFIRMATIONS_BTC = 6;
  const FIRST_BLOCK = 1;
  const LAST_CONFIRMED_BLOCK = 1000;
  const LAST_BLOCK = LAST_CONFIRMED_BLOCK + 3;
  const BLOCK_CHOICE = 950;
  const TXS_IN_BLOCK = 10;

  const SECURE_CONFIG_PATH = "./test/attestationClient/test-data";

  const RPC = "http://127.0.0.1:8545";
  const STATE_CONNECTOR_ADDRESS = "0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F";
  const BIT_VOTE_ADDRESS = "0x8858eeB3DfffA017D4BCE9801D340D36Cf895CCf";
  const SPAMMER_PRIVATE_KEY = "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b29087";

  const NUMBER_OF_CLIENTS = 9;
  const IN_PROCESS_CLIENTS = 1;
  const NUMBER_OF_FAILING_CLIENTS = 0;
  const WEB_SERVER_IN_OTHER_PROCESS = false;
  const SPAMMER_GAPS = [];
  const SPAMMER_FREQUENCIES = [];

  // Testing modes:
  // scheduler: time is managed by Scheduler
  // offset: time is real, only that it is shifted in order to start everything exactly on a beginning of the
  //         next buffer window on StateConnectorTempTran contract
  // let TEST_MODE: "scheduler" | "offset" | "none" = "none"
  // const ADDITIONAL_OFFSET_PCT = 0
  const TEST_OVERRIDE_QUERY_WINDOW_IN_SEC = LAST_CONFIRMED_BLOCK - FIRST_BLOCK;

  let setup: VerifierTestSetups;
  let web3: Web3;
  let requestXRP: ARPayment;
  let requestBTC: ARPayment;
  let attestationXRP: Attestation;
  let attestationBTC: Attestation;
  let stateConnector: StateConnectorTempTran;
  let bitVoting: BitVoting;
  let spammerWallet: any;
  let bufferWindowDurationSec: number;
  let bufferTimestampOffsetSec: number;
  let startTime: number;
  let signers: string[] = [];
  let privateKeys: string[] = [];
  let childProcesses: any[] = [];
  let runPromises = [];
  let definitions: AttestationTypeScheme[];
  let clients: AttesterClient[];

  const logger = getGlobalLogger();

  before(async function () {
    definitions = await readAttestationTypeSchemes();

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

    process.env.SECURE_CONFIG_PATH = SECURE_CONFIG_PATH;
    process.env.TEST_CREDENTIALS = "1";
    // delete process.env.TEST_CREDENTIALS;

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
    let abiPathBitVoting = await relativeContractABIPathForContractName("BitVotingTest", artifacts);
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

    // if (TEST_MODE === "offset") {
    //   let ADDITIONAL_OFFSET_S = Math.floor(ADDITIONAL_OFFSET_PCT * bufferWindowDurationSec);
    //   let now = Math.floor(Date.now() / 1000);
    //   let nextBufferNumber = Math.ceil((now - bufferTimestampOffsetSec) / bufferWindowDurationSec) + 1; // add one more bufferWindow
    //   startTime = bufferTimestampOffsetSec + nextBufferNumber * bufferWindowDurationSec;
    //   let offset = startTime - now + ADDITIONAL_OFFSET_S;
    //   process.env.TEST_OFFSET_TIME = '' + offset;
    //   let lastBlockBefore = await web3.eth.getBlock(await web3.eth.getBlockNumber());
    //   await increaseTo(web3, startTime);
    //   let lastBlock = await web3.eth.getBlock(await web3.eth.getBlockNumber());
    //   console.log(`Moving for offset ${offset}: blockNumber: ${lastBlockBefore.number} -> ${lastBlock.number}, timestamp: ${lastBlockBefore.timestamp} -> ${lastBlock.timestamp} `);
    // }

    // Spammer wallet
    spammerWallet = web3.eth.accounts.privateKeyToAccount(SPAMMER_PRIVATE_KEY);

    // Initialize verifiers
    let bootstrapOptions = {
      lastTimestamp: startTime,
      FIRST_BLOCK,
      LAST_BLOCK,
      LAST_CONFIRMED_BLOCK,
      TXS_IN_BLOCK,
      BLOCK_CHOICE,
    } as VerifierBootstrapOptions;
    setup = await bootstrapTestVerifiers(bootstrapOptions, false);

    // console.log("XXX")
    // let a = 1/1;
    // if (a === 1) {
    //   process.exit(1);
    // }

    // Initialize test requests

    requestXRP = await testPaymentRequest(setup.XRP.selectedTransaction, XrpTransaction, ChainType.XRP);
    attestationXRP = prepareAttestation(requestXRP, setup.startTime);

    let inUtxo = firstAddressVin(setup.BTC.selectedTransaction);
    let utxo = firstAddressVout(setup.BTC.selectedTransaction);
    requestBTC = await testPaymentRequest(setup.BTC.selectedTransaction, BtcTransaction, ChainType.BTC, inUtxo, utxo);
    attestationBTC = prepareAttestation(requestBTC, setup.startTime);

    // starting simple spammer
    await startSimpleSpammer(
      getGlobalLogger(),
      stateConnector,
      web3,
      spammerWallet,
      bufferWindowDurationSec / 4, //to get duplicates
      [attestationXRP.data.request, attestationBTC.data.request],
      SPAMMER_FREQUENCIES,
      SPAMMER_GAPS
    );

    ///////////////////////////////////
    // Attester related intializations
    ///////////////////////////////////

    process.env.TEST_OVERRIDE_QUERY_WINDOW_IN_SEC = "" + TEST_OVERRIDE_QUERY_WINDOW_IN_SEC;
    process.env.TEST_SAMPLING_REQUEST_INTERVAL = "" + 1000;
    let bootstrapPromises = [];

    // Finalization bot
    let finalizationPromise = runBot(STATE_CONNECTOR_ADDRESS, RPC, "temp", false);
    runPromises.push(finalizationPromise);

    // let currentRound = await web3.eth.getBlockNumber();
    // while (currentRound < 9) {
    //   sleepMs(500);
    //   currentRound = await web3.eth.getBlockNumber();
    // }

    // spawning the rest of clients in new processes
    for (let i = IN_PROCESS_CLIENTS; i < NUMBER_OF_CLIENTS - NUMBER_OF_FAILING_CLIENTS; i++) {
      const child = spawn(
        "yarn",
        ["ts-node", "test/attestationClient/utils/runTestAttestationClient.ts", "-n", `${i}`, "-c", "./test/attestationClient/test-data"],
        { shell: true }
      );
      childProcesses.push(child);
    }
    othersStart = Date.now();

    // in-process clients
    for (let i = 0; i < IN_PROCESS_CLIENTS; i++) {
      bootstrapPromises.push(bootstrapAttestationClient(i));
    }
    clients = await Promise.all(bootstrapPromises);
    runPromises = clients.map((client) => client.runAttesterClient());

    inprocessStart = Date.now();

    // // starting web server on the first node
    // if (WEB_SERVER_IN_OTHER_PROCESS) {
    //   const child = spawn("yarn", [
    //     "ts-node",
    //     "test/attestationClient/utils/runTestWebServer.ts",
    //   ], { shell: true });
    //   console.log("XXXXXX - server")
    //   childProcesses.push(child);
    // } else {
    await bootstrapAttestationWebServer();
    // }
    startblock = await web3.eth.getBlockNumber();

    setInterval(async () => {
      let blockChainNow = (await web3.eth.getBlock(await web3.eth.getBlockNumber())).timestamp;
      let now = getUnixEpochTimestamp();

      if (process.env.NODE_ENV === "development") {
        logger.info(`DIFF: ${now} - ${blockChainNow} = ${now - parseInt("" + blockChainNow, 10)}`);

        // const klient = clients[0];
        // const mngr = klient.attestationRoundManager;
        // console.log("active round", mngr.activeRoundId);
        // const prevRound = mngr.rounds.get(mngr.activeRoundId - 1);
        // const curRound = mngr.rounds.get(mngr.activeRoundId);

        // console.log("num of att", prevRound.attestations.length, curRound.attestations.length);
        // console.log("num of bitvotes", prevRound.bitVoteMap.size, curRound.bitVoteMap.size);
      }
    }, 4000);
    // await Promise.all(runPromises);

    //sprocess.exit(20);
  });

  after(async () => {
    //await Promise.all(runPromises);
    delete process.env.TEST_CREDENTIALS;
    await setup.XRP.app.close();
    await setup.BTC.app.close();
    for (let child of childProcesses) {
      child.stdin.pause();
      child.kill();
    }
    sinon.restore();
  });

  //after this it the process is killed
  it("Client works", async function () {
    const client = clients[0];

    console.log("Wait for 5 epochs (80s)");
    await sleepMs(80000);
    const activeRound = client.attestationRoundManager.activeRoundId;

    const round = client.attestationRoundManager.rounds.get(activeRound - 3);

    const res1 = await client.flareConnection.attesterState.getRound(activeRound - 3);

    const res2 = await client.flareConnection.attesterState.getRound(activeRound - 2);

    // console.log(res1);
    // console.log(round.roundId, "round ID");
    // console.log(round.attestations.length);
    // console.log(res2);

    // console.log(
    //   "start",
    //   start,
    //   "hardhat",
    //   hardhatStart - start,
    //   "spammer",
    //   spammerStart - hardhatStart,
    //   "others",
    //   othersStart - spammerStart,
    //   "clients",
    //   inprocessStart - othersStart
    // );
    assert(client);
    assert(client.flareDataCollector);
    const nuOfRounds = client.attestationRoundManager.rounds.size;
    expect(nuOfRounds).to.be.greaterThanOrEqual(3);
    assert(res1.commitNonce == 6 || res1.commitNonce == 4, "commitNonce");
    expect(res1.merkleRoot, "root").to.not.eq(toHex(0, 32));
    assert(res1.revealNonce);
  });
});

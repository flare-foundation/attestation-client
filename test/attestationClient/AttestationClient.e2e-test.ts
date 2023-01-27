// yarn test test/attestationClient/attestationClient.test.ts

import { BtcTransaction, ChainType, prefix0x, sleepMs, traceManager, XrpTransaction } from "@flarenetwork/mcc";
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { spawn } from "child_process";
import * as fs from "fs";
import waitOn from "wait-on";
import Web3 from "web3";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logger";
import { setRetryFailureCallback } from "../../src/utils/PromiseTimeout";
import { getUnixEpochTimestamp, getWeb3, relativeContractABIPathForContractName } from "../../src/utils/utils";
import { VerifierRouter } from "../../src/verification/routing/VerifierRouter";
import { BitVoting } from "../../typechain-web3-v1/BitVoting";
import { StateConnectorTempTran } from "../../typechain-web3-v1/StateConnectorTempTran";
import { firstAddressVin, firstAddressVout, testPaymentRequest } from "../indexed-query-manager/utils/indexerTestDataGenerator";
import { getTestFile, TERMINATION_TOKEN } from "../test-utils/test-utils";
import { bootstrapTestVerifiers, clearTestDatabases, prepareAttestation, VerifierBootstrapOptions, VerifierTestSetups } from "../verification/test-utils/verifier-test-utils";
import { assertAddressesMatchPrivateKeys, bootstrapAttestationClient, bootstrapAttestationWebServer, deployTestContracts, getVoterAddresses, increaseTo, selfAssignAttestationProviders, setIntervalMining, startSimpleSpammer, submitAttestationRequest } from "./utils/attestation-client-test-utils";
import sinon from "sinon";
import { ARPayment } from "../../src/verification/generated/attestation-request-types";
import { Attestation } from "../../src/attester/Attestation";
import { runBot } from "../../src/state-collector-finalizer/state-connector-validator-bot";
chai.use(chaiAsPromised);


const NUMBER_OF_CONFIRMATIONS_XRP = 1;
const NUMBER_OF_CONFIRMATIONS_BTC = 6;
const FIRST_BLOCK = 1;
const LAST_CONFIRMED_BLOCK = 1000;
const LAST_BLOCK = LAST_CONFIRMED_BLOCK + 3;
const BLOCK_CHOICE = 950;
const TXS_IN_BLOCK = 10;

const CONFIG_PATH_ATTESTER = "../test/attestationClient/test-data/attester"
const CONFIG_PATH_VERIFIER = "../test/attestationClient/test-data/test-verifier"

const RPC = "http://127.0.0.1:8545";
const STATE_CONNECTOR_ADDRESS = "0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F";
const BIT_VOTE_ADDRESS = "0x8858eeB3DfffA017D4BCE9801D340D36Cf895CCf";
const SPAMMER_PRIVATE_KEY = "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b29087"

// set false to debug with global logger
const TEST_LOGGER = false;
const NUMBER_OF_CLIENTS = 9;
const IN_PROCESS_CLIENTS = 1
const NUMBER_OF_FAILING_CLIENTS = 0;


// Testing modes:
// scheduler: time is managed by Scheduler
// offset: time is real, only that it is shifted in order to start everything exactly on a beginning of the 
//         next buffer window on StateConnectorTempTran contract
// let TEST_MODE: "scheduler" | "offset" | "none" = "none"
// const ADDITIONAL_OFFSET_PCT = 0
const TEST_OVERRIDE_QUERY_WINDOW_IN_SEC = LAST_CONFIRMED_BLOCK - FIRST_BLOCK;

describe(`AttestationClient (${getTestFile(__filename)})`, () => {
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

  before(async function () {
    if (TEST_LOGGER) {
      initializeTestGlobalLogger();
    }
    // clear all test databases in './db/' folder
    clearTestDatabases();

    // setRetryFailureCallback((label: string) => {
    //   throw new Error(TERMINATION_TOKEN);
    // });

    traceManager.displayStateOnException = false;
    sinon.stub(process, 'exit');

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

    process.env.TEST_CREDENTIALS = '1';

    // Bootstrap hardhat blockchain
    let child = spawn("yarn", ["hardhat", "node"], { shell: true });
    childProcesses.push(child);
    await waitOn({ resources: [RPC] });


    // Deploy state connector and bit voting contracts (they get always deployed on the fixed addresses)
    privateKeys = JSON.parse(fs.readFileSync(`test-1020-accounts.json`).toString()).map(x => x.privateKey);
    const PRIVATE_KEY = privateKeys[0];
    await deployTestContracts(RPC, PRIVATE_KEY);

    // connect and initialize chain for interval mining
    process.env.TEST_HARDHAT_NODE = "1"   // disable handleRevert due to bug in combination of web3.js & ganache
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
      CONFIG_PATH: CONFIG_PATH_VERIFIER,
      FIRST_BLOCK, LAST_BLOCK, LAST_CONFIRMED_BLOCK, TXS_IN_BLOCK, BLOCK_CHOICE
    } as VerifierBootstrapOptions;
    setup = await bootstrapTestVerifiers(bootstrapOptions, false);

    // Initialize test requests

    requestXRP = await testPaymentRequest(setup.XRP.selectedTransaction, XrpTransaction, ChainType.XRP);
    attestationXRP = prepareAttestation(requestXRP, setup.startTime);

    let inUtxo = firstAddressVin(setup.BTC.selectedTransaction);
    let utxo = firstAddressVout(setup.BTC.selectedTransaction);
    requestBTC = await testPaymentRequest(setup.BTC.selectedTransaction, BtcTransaction, ChainType.BTC, inUtxo, utxo);
    attestationBTC = prepareAttestation(requestBTC, setup.startTime);

    ///////////////////////////////////
    // Attester related intializations
    ///////////////////////////////////

    // DO NOT CHANGE CONFIG_PATH while attester clients are running!!!
    process.env.CONFIG_PATH = CONFIG_PATH_ATTESTER;
    process.env.TEST_OVERRIDE_QUERY_WINDOW_IN_SEC = '' + TEST_OVERRIDE_QUERY_WINDOW_IN_SEC;
    process.env.TEST_SAMPLING_REQUEST_INTERVAL = '' + 1000;
    let bootstrapPromises = [];

    // Finalization bot
    let finalizationPromise = runBot(STATE_CONNECTOR_ADDRESS, RPC, "temp");
    runPromises.push(finalizationPromise);

    // in-process clients
    for (let i = 0; i < IN_PROCESS_CLIENTS; i++) {
      bootstrapPromises.push(bootstrapAttestationClient(i));
    }
    let clients = await Promise.all(bootstrapPromises);
    runPromises = clients.map(client => client.runAttesterClient());

    // spawning the rest of clients in new processes
    for (let i = IN_PROCESS_CLIENTS; i < NUMBER_OF_CLIENTS - NUMBER_OF_FAILING_CLIENTS; i++) {
      const child = spawn("yarn", [
        "ts-node",
        "test/attestationClient/utils/runTestAttestationClient.ts",
        "-n", `${i}`,
        "-c", "../test/attestationClient/test-data/attester"
      ], { shell: true });
      childProcesses.push(child)
    }

    // starting web server on the first node
    await bootstrapAttestationWebServer();

    // starting simple spammer
    await startSimpleSpammer(stateConnector, web3, spammerWallet, bufferWindowDurationSec, [attestationXRP.data.request, attestationBTC.data.request], [2, 3]);

    setInterval(async () => {
      let now = getUnixEpochTimestamp();
      let blockChainNow = await (await web3.eth.getBlock(await web3.eth.getBlockNumber())).timestamp;
      console.log(`DIFF: ${now} - ${blockChainNow} = ${now - parseInt('' + blockChainNow, 10)}`);
    }, 1000)
    // await Promise.all(runPromises);

  });

  after(async () => {
    await Promise.all(runPromises);
    delete process.env.TEST_CREDENTIALS;
    await setup.XRP.app.close();
    await setup.BTC.app.close();
    for (let child of childProcesses) {
      child.stdin.pause();
      child.kill();
    }
    sinon.restore();
  });

  beforeEach(async function () {
    // TestLogger.clear();
    // const logger = getGlobalLogger();
  });

  it.skip(`Should start times be correct`, async function () {
    assert(startTime === setup.lastTimestamp, "Start times do not match");
  });

  it(`Should contracts be deployed on the correct addresses`, async function () {
    assert(await stateConnector.methods.BUFFER_WINDOW().call() === "16", "BUFFER_WINDOW on state connector wrong");
    assert(await bitVoting.methods.BUFFER_WINDOW().call() === "16", "BUFFER_WINDOW on bit voting wrong");
    assert(await bitVoting.methods.BIT_VOTE_DEADLINE().call() === "8", "BIT_VOTE_DEADLINE on bit voting wrong");
  });

  it.skip(`Should be able to verify attestations through VerifierRouter`, async function () {
    process.env.CONFIG_PATH = CONFIG_PATH_VERIFIER;
    const verifierRouter = new VerifierRouter();
    await verifierRouter.initialize(150);

    let respXRP = await verifierRouter.verifyAttestation(attestationXRP);

    assert(respXRP.response.transactionHash === prefix0x(setup.XRP.selectedTransaction.transactionId), "Wrong transaction id");

    let respBTC = await verifierRouter.verifyAttestation(attestationBTC);

    assert(respBTC.response.transactionHash === prefix0x(setup.BTC.selectedTransaction.transactionId), "Wrong transaction id");
  });

});

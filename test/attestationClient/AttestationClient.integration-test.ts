// yarn test test/attestationClient/attestationClient.test.ts

import { ChainType, prefix0x, sleepMs, traceManager } from "@flarenetwork/mcc";
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { spawn } from "child_process";
import * as fs from "fs";
import waitOn from "wait-on";
import Web3 from "web3";
import { DBBlockBTC, DBBlockXRP } from "../../src/entity/indexer/dbBlock";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logger";
import { setRetryFailureCallback } from "../../src/utils/PromiseTimeout";
import { getWeb3, relativeContractABIPathForContractName } from "../../src/utils/utils";
import { VerifierRouter } from "../../src/verification/routing/VerifierRouter";
import { BitVoting } from "../../typechain-web3-v1/BitVoting";
import { StateConnectorTempTran } from "../../typechain-web3-v1/StateConnectorTempTran";
import { testPaymentRequest } from "../indexed-query-manager/utils/indexerTestDataGenerator";
import { getTestFile, TERMINATION_TOKEN } from "../test-utils/test-utils";
import { bootstrapTestVerifiers, prepareAttestation, VerifierBootstrapOptions, VerifierTestSetups } from "../verification/test-utils/verifier-test-utils";
import { bootstrapAttestationClient, deployTestContracts } from "./utils/attestation-client-test-utils";
import sinon from "sinon";
chai.use(chaiAsPromised);


const NUMBER_OF_CONFIRMATIONS_XRP = 1;
const NUMBER_OF_CONFIRMATIONS_BTC = 6;
const FIRST_BLOCK = 100;
const LAST_BLOCK = 203;
const LAST_CONFIRMED_BLOCK = 200;
const BLOCK_CHOICE = 150;
const TXS_IN_BLOCK = 10;
const CONFIG_PATH_ATTESTER = "../test/attestationClient/test-data/attester"
const CONFIG_PATH_VERIFIER = "../test/attestationClient/test-data/test-verifier"

const RPC = "http://127.0.0.1:8545";
const STATE_CONNECTOR_ADDRESS = "0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F";
const BIT_VOTE_ADDRESS = "0x8858eeB3DfffA017D4BCE9801D340D36Cf895CCf";
const PRIVATE_KEY = "0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122";

// set false to debug with global logger
const TEST_LOGGER = false;


describe(`AttestationClient (${getTestFile(__filename)})`, () => {
  let setup: VerifierTestSetups;
  let child;
  let web3: Web3;
  before(async function () {
    if (TEST_LOGGER) {
      initializeTestGlobalLogger();
    }


    // setRetryFailureCallback((label: string) => {
    //   throw new Error(TERMINATION_TOKEN);
    // });

    traceManager.displayStateOnException = false;
    sinon.stub(process, 'exit');

    (process.exit as any).callsFake((code) => {
      console.log(`EXIT`);
      delete process.env.TEST_CREDENTIALS;
      child.stdin.pause();
      child.kill();
      sinon.restore();
      process.exit();
    });

    process.env.TEST_CREDENTIALS = '1';

    child = spawn("yarn", ["hardhat", "node"], { shell: true });

    await waitOn({ resources: [RPC] });
    await deployTestContracts(RPC, PRIVATE_KEY);
    web3 = getWeb3(RPC);
    let bootstrapOptions = {
      CONFIG_PATH: CONFIG_PATH_VERIFIER,
      FIRST_BLOCK, LAST_BLOCK, LAST_CONFIRMED_BLOCK, TXS_IN_BLOCK, BLOCK_CHOICE
    } as VerifierBootstrapOptions;
    setup = await bootstrapTestVerifiers(bootstrapOptions, false);
  });

  after(async () => {
    delete process.env.TEST_CREDENTIALS;
    await setup.XRP.app.close();
    await setup.BTC.app.close();
    child.stdin.pause();
    child.kill();
    sinon.restore();
  });

  beforeEach(async function () {
    // TestLogger.clear();
    const logger = getGlobalLogger();
  });

  it(`Should contracts be deployed on the correct addresses`, async function () {
    const artifacts = "artifacts";
    let abiPathStateConnector = await relativeContractABIPathForContractName("StateConnectorTempTran", artifacts);
    let abiPathBitVoting = await relativeContractABIPathForContractName("BitVoting", artifacts);
    let stateConnectorABI = JSON.parse(fs.readFileSync(`${artifacts}/${abiPathStateConnector}`).toString());
    let bitVotingABI = JSON.parse(fs.readFileSync(`${artifacts}/${abiPathBitVoting}`).toString());
    let stateConnector = new web3.eth.Contract(stateConnectorABI.abi, STATE_CONNECTOR_ADDRESS) as any as StateConnectorTempTran;
    let bitVoting = new web3.eth.Contract(bitVotingABI.abi, BIT_VOTE_ADDRESS) as any as BitVoting;

    assert(await stateConnector.methods.BUFFER_WINDOW().call() === "90");
    assert(await bitVoting.methods.BUFFER_WINDOW().call() === "90");
  });

  it(`Should be able to verify attestations through VerifierRouter`, async function () {
    process.env.CONFIG_PATH = CONFIG_PATH_VERIFIER;
    const verifierRouter = new VerifierRouter();
    await verifierRouter.initialize(150);

    let requestXRP = await testPaymentRequest(setup.XRP.entityManager, setup.XRP.selectedTransaction, DBBlockXRP, NUMBER_OF_CONFIRMATIONS_XRP, ChainType.XRP);
    const attestationXRP = prepareAttestation(requestXRP, setup.startTime);

    let requestBTC = await testPaymentRequest(setup.BTC.entityManager, setup.BTC.selectedTransaction, DBBlockBTC, NUMBER_OF_CONFIRMATIONS_BTC, ChainType.BTC);
    const attestationBTC = prepareAttestation(requestBTC, setup.startTime);

    let respXRP = await verifierRouter.verifyAttestation(attestationXRP, attestationXRP.reverification);

    assert(respXRP.status === "OK", "Wrong server response");
    assert(respXRP.data.response.transactionHash === prefix0x(setup.XRP.selectedTransaction.transactionId), "Wrong transaction id");

    let respBTC = await verifierRouter.verifyAttestation(attestationBTC, attestationBTC.reverification);

    assert(respBTC.status === "OK", "Wrong server response");
    assert(respBTC.data.response.transactionHash === prefix0x(setup.BTC.selectedTransaction.transactionId), "Wrong transaction id");
  });

  it(`Should bootstrap attestation client`, async function () {
    process.env.CONFIG_PATH = CONFIG_PATH_ATTESTER;
    let attClient0 = await bootstrapAttestationClient(0);
    await attClient0.runAttesterClient();
    console.log("RUN");
    await sleepMs(10000);
  });

});

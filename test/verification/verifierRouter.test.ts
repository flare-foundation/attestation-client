import { ChainType, prefix0x } from "@flarenetwork/mcc";
import chai, { assert, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { DBBlockBTC, DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { WsClientOptions } from "../../lib/verification/client/WsClientOptions";
import { VerifierRouter } from "../../lib/verification/routing/VerifierRouter";
import { selectBlock, testConfirmedBlockHeightExistsRequest, testPaymentRequest } from "../indexed-query-manager/utils/indexerTestDataGenerator";
import { getTestFile } from "../test-utils/test-utils";
import { bootstrapTestVerifiers, prepareAttestation, VerifierBootstrapOptions, VerifierTestSetups } from "./test-utils/verifier-test-utils";

chai.use(chaiAsPromised);

const WS_URL = `ws://localhost:9500?apiKey=7890`;

const defaultWsClientOptions: WsClientOptions = new WsClientOptions();
defaultWsClientOptions.url = WS_URL;

const NUMBER_OF_CONFIRMATIONS_XRP = 1;
const NUMBER_OF_CONFIRMATIONS_BTC = 6;
const FIRST_BLOCK = 100;
const LAST_BLOCK = 203;
const LAST_CONFIRMED_BLOCK = 200;
const BLOCK_CHOICE = 150;
const TXS_IN_BLOCK = 10;
const CONFIG_PATH = "../test/verification/test-data/test-verifier"

describe(`VerifierRouter tests (${getTestFile(__filename)})`, () => {

  let setup: VerifierTestSetups;
  
  before(async () => {
    process.env.TEST_CREDENTIALS = '1';
    let bootstrapOptions = {
      CONFIG_PATH, FIRST_BLOCK, LAST_BLOCK, LAST_CONFIRMED_BLOCK, TXS_IN_BLOCK, BLOCK_CHOICE
    } as VerifierBootstrapOptions;    
    setup = await bootstrapTestVerifiers(bootstrapOptions);
  });


  it(`Should verify attestation`, async function () {
    process.env.CONFIG_PATH = CONFIG_PATH;    
    const verifierRouter = new VerifierRouter();
    await verifierRouter.initialize();

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



  it(`Should fail due to sending wrong route`, async function () {
    process.env.CONFIG_PATH = CONFIG_PATH;
    const verifierRouter = new VerifierRouter();
    await verifierRouter.initialize();

    let confirmationBlock = await selectBlock(setup.XRP.entityManager, DBBlockXRP, BLOCK_CHOICE);
    let requestXRP = await testConfirmedBlockHeightExistsRequest(confirmationBlock, ChainType.XRP);

    const attestationXRP = prepareAttestation(requestXRP, setup.startTime);

    await expect(verifierRouter.verifyAttestation(attestationXRP, attestationXRP.reverification)).to.eventually.be.rejectedWith("Invalid route.");

  });

  it(`Should fail due to verifier not supporting the attestation type`, async function () {
    process.env.CONFIG_PATH = CONFIG_PATH;
    const verifierRouter = new VerifierRouter();
    await verifierRouter.initialize();

    let confirmationBlock = await selectBlock(setup.BTC.entityManager, DBBlockBTC, BLOCK_CHOICE);
    let requestBTC = await testConfirmedBlockHeightExistsRequest(confirmationBlock, ChainType.BTC);

    const attestationBTC = prepareAttestation(requestBTC, setup.startTime);

    const resp = await verifierRouter.verifyAttestation(attestationBTC, attestationBTC.reverification);
    assert(resp.status === 'ERROR', "Did not reject the attestation");
    assert(resp.errorMessage.startsWith("Error: Unsupported attestation type 'ConfirmedBlockHeightExists'"), "Wrong error message")

  });

  after(async () => {
    await setup.XRP.app.close();
    await setup.BTC.app.close();
  });

});




import { BtcTransaction, ChainType, prefix0x, sleepMs, XrpTransaction } from "@flarenetwork/mcc";
import chai, { assert, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { DBBlockBTC, DBBlockXRP } from "../../src/entity/indexer/dbBlock";
import { WsClientOptions } from "../../src/verification/client/WsClientOptions";
import { VerifierRouter } from "../../src/verification/routing/VerifierRouter";
import { firstAddressVin, firstAddressVout, selectBlock, testConfirmedBlockHeightExistsRequest, testPaymentRequest } from "../indexed-query-manager/utils/indexerTestDataGenerator";
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
const BLOCK_QUERY_WINDOW = 90;
const CONFIG_PATH = "../test/verification/test-data/test-verifier"

describe(`VerifierRouter tests (${getTestFile(__filename)})`, () => {

  let setup: VerifierTestSetups;

  before(async () => {
    process.env.TEST_CREDENTIALS = '1';
    let bootstrapOptions = {
      whichBTC: 5,
      CONFIG_PATH, FIRST_BLOCK, LAST_BLOCK, LAST_CONFIRMED_BLOCK, TXS_IN_BLOCK, BLOCK_CHOICE
    } as VerifierBootstrapOptions;
    setup = await bootstrapTestVerifiers(bootstrapOptions);
  });

  after(async () => {
    delete process.env.TEST_CREDENTIALS;
    await setup.XRP.app.close();
    await setup.BTC.app.close();
  });

  it(`Should verify attestation`, async function () {
    process.env.CONFIG_PATH = CONFIG_PATH;
    const verifierRouter = new VerifierRouter();
    await verifierRouter.initialize(150);

    let requestXRP = await testPaymentRequest(setup.XRP.selectedTransaction, XrpTransaction, ChainType.XRP);
    const attestationXRP = prepareAttestation(requestXRP, setup.startTime);

    let inUtxo = firstAddressVin(setup.BTC.selectedTransaction);
    let utxo = firstAddressVout(setup.BTC.selectedTransaction);

    let requestBTC = await testPaymentRequest(setup.BTC.selectedTransaction, BtcTransaction, ChainType.BTC, inUtxo, utxo);
    const attestationBTC = prepareAttestation(requestBTC, setup.startTime);

    let respXRP = await verifierRouter.verifyAttestation(attestationXRP);

    assert(respXRP.status === "OK", "Wrong server response");
    assert(respXRP.response.transactionHash === prefix0x(setup.XRP.selectedTransaction.transactionId), "Wrong transaction id");

    let respBTC = await verifierRouter.verifyAttestation(attestationBTC);
    // console.log("XRP", attestationXRP.data.request, requestXRP)
    // console.log("BTC", attestationBTC.data.request, requestBTC)
    assert(respBTC.status === "OK", "Wrong server response");
    assert(respBTC.response.transactionHash === prefix0x(setup.BTC.selectedTransaction.transactionId), "Wrong transaction id");
  });



  it(`Should fail due to sending wrong route`, async function () {
    process.env.CONFIG_PATH = CONFIG_PATH;
    const verifierRouter = new VerifierRouter();
    await verifierRouter.initialize(150);

    let confirmationBlock = await selectBlock(setup.XRP.entityManager, DBBlockXRP, BLOCK_CHOICE);
    let lowerQueryWindowBlock = await selectBlock(setup.XRP.entityManager, DBBlockXRP, FIRST_BLOCK);
    let requestXRP = await testConfirmedBlockHeightExistsRequest(confirmationBlock, lowerQueryWindowBlock, ChainType.XRP, NUMBER_OF_CONFIRMATIONS_XRP, BLOCK_QUERY_WINDOW);

    const attestationXRP = prepareAttestation(requestXRP, setup.startTime);
    await expect(verifierRouter.verifyAttestation(attestationXRP)).to.eventually.be.rejectedWith("Invalid route.");

  });

  it(`Should fail due to verifier not supporting the attestation type`, async function () {
    process.env.CONFIG_PATH = CONFIG_PATH;
    const verifierRouter = new VerifierRouter();
    await verifierRouter.initialize(150);

    let confirmationBlock = await selectBlock(setup.BTC.entityManager, DBBlockBTC, BLOCK_CHOICE);
    let lowerQueryWindowBlock = await selectBlock(setup.BTC.entityManager, DBBlockBTC, FIRST_BLOCK);
    let requestBTC = await testConfirmedBlockHeightExistsRequest(confirmationBlock, lowerQueryWindowBlock, ChainType.BTC, NUMBER_OF_CONFIRMATIONS_BTC, BLOCK_QUERY_WINDOW);

    const attestationBTC = prepareAttestation(requestBTC, setup.startTime);

    try {
      await verifierRouter.verifyAttestation(attestationBTC);
    } catch (e) {
      assert(e.message.startsWith("Error: Unsupported attestation type 'ConfirmedBlockHeightExists'"), "Wrong error message");
    }
    // await sleepMs(10000000)
  });

});




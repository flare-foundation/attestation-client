import { BtcTransaction, ChainType, prefix0x, XrpTransaction } from "@flarenetwork/mcc";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { DBBlockBTC, DBBlockXRP } from "../../src/entity/indexer/dbBlock";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";
import { AttestationResponseStatus } from "../../src/external-libs/AttestationResponse";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { toHex } from "../../src/verification/attestation-types/attestation-types-helpers";
import { VerifierRouteConfig } from "../../src/verification/routing/configs/VerifierRouteConfig";
import { VerifierRouter } from "../../src/verification/routing/VerifierRouter";
import {
  firstAddressVin,
  firstAddressVout,
  selectBlock,
  testConfirmedBlockHeightExistsRequest,
  testPaymentRequest,
} from "../indexed-query-manager/utils/indexerTestDataGenerator";
import { getTestFile } from "../test-utils/test-utils";
import { bootstrapTestVerifiers, prepareAttestation, VerifierBootstrapOptions, VerifierTestSetups } from "./test-utils/verifier-test-utils";

chai.use(chaiAsPromised);

const NUMBER_OF_CONFIRMATIONS_XRP = 1;
const NUMBER_OF_CONFIRMATIONS_BTC = 6;

const FIRST_BLOCK = 100;
const LAST_BLOCK = 203;
const LAST_CONFIRMED_BLOCK = 200;
const BLOCK_CHOICE = 150;
const TXS_IN_BLOCK = 10;
const BLOCK_QUERY_WINDOW = 90;

describe(`VerifierRouter tests (${getTestFile(__filename)})`, () => {
  let setup: VerifierTestSetups;
  let defStore: AttestationDefinitionStore;

  before(async () => {
    process.env.TEST_CREDENTIALS = "1";
    process.env.SECURE_CONFIG_PATH = "./test/verification/test-data";

    let bootstrapOptions = {
      whichBTC: 5,
      FIRST_BLOCK,
      LAST_BLOCK,
      LAST_CONFIRMED_BLOCK,
      TXS_IN_BLOCK,
      BLOCK_CHOICE,
    } as VerifierBootstrapOptions;
    setup = await bootstrapTestVerifiers(bootstrapOptions, true, true, true);
    defStore = new AttestationDefinitionStore("configs/type-definitions");
  });

  after(async () => {
    delete process.env.TEST_CREDENTIALS;
    await setup.XRP.app.close();
    await setup.BTC.app.close();
    await setup.Doge.app.close();
  });

  it("Should check if the type is supported", async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, defStore);

    const res = verifierRouter.isSupported("ALGO", "BalanceDecreasingTransaction");
    assert(!res);
  });

  it("Should not initialize twice", async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, defStore);

    await expect(verifierRouter.initialize(verifierConfig, defStore)).to.be.rejectedWith("Already initialized");
  });

  it("Should not initialize without configuration", async function () {
    const verifierRouter = new VerifierRouter();

    await expect(verifierRouter.initialize(undefined, defStore)).to.be.rejectedWith("Missing configuration");
  });

  it(`Should verify attestation payment`, async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, defStore);

    let requestXRP = await testPaymentRequest(defStore, setup.XRP.selectedTransaction, XrpTransaction, ChainType.XRP);
    const attestationXRP = prepareAttestation(defStore, requestXRP, setup.startTime);

    let inUtxo = firstAddressVin(setup.BTC.selectedTransaction);
    let utxo = firstAddressVout(setup.BTC.selectedTransaction);

    let requestBTC = await testPaymentRequest(defStore, setup.BTC.selectedTransaction, BtcTransaction, ChainType.BTC, inUtxo, utxo);

    const attestationBTC = prepareAttestation(defStore, requestBTC, setup.startTime);
    let respXRP = await verifierRouter.verifyAttestation(attestationXRP);

    assert(respXRP.status === AttestationResponseStatus.VALID, "Wrong server response");
    assert(respXRP.response.requestBody.transactionId === prefix0x(setup.XRP.selectedTransaction.transactionId), "Wrong transaction id");
    let respBTC = await verifierRouter.verifyAttestation(attestationBTC);
    // console.log("XRP", attestationXRP.data.request, requestXRP)
    // console.log("BTC", attestationBTC.data.request, requestBTC)
    assert(respBTC.status === AttestationResponseStatus.VALID, "Wrong server response");
    assert(respBTC.response.requestBody.transactionId === prefix0x(setup.BTC.selectedTransaction.transactionId), "Wrong transaction id");
  });

  it(`Should not verify corrupt attestation payment`, async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, defStore);

    let requestXRP = await testPaymentRequest(defStore, setup.XRP.selectedTransaction, XrpTransaction, ChainType.XRP);
    requestXRP.requestBody.transactionId = toHex(0, 32);
    const attestationXRP = prepareAttestation(defStore, requestXRP, setup.startTime);

    let inUtxo = firstAddressVin(setup.BTC.selectedTransaction);
    let utxo = firstAddressVout(setup.BTC.selectedTransaction);

    let requestBTC = await testPaymentRequest(defStore, setup.BTC.selectedTransaction, BtcTransaction, ChainType.BTC, inUtxo, utxo);
    requestBTC.requestBody.transactionId = toHex(0, 32);
    const attestationBTC = prepareAttestation(defStore, requestBTC, setup.startTime);

    let respXRP = await verifierRouter.verifyAttestation(attestationXRP);

    assert(respXRP.status === AttestationResponseStatus.INVALID, "Wrong server response");

    let respBTC = await verifierRouter.verifyAttestation(attestationBTC);
    // console.log("XRP", attestationXRP.data.request, requestXRP)
    // console.log("BTC", attestationBTC.data.request, requestBTC)
    assert(respBTC.status === AttestationResponseStatus.INVALID, "Wrong server response");
  });

  it("Should verify attestation confirmed block height", async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, defStore);
  });

  it(`Should fail due to sending wrong route`, async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, defStore);

    let confirmationBlock = await selectBlock(setup.XRP.entityManager, DBBlockXRP, BLOCK_CHOICE);
    let lowerQueryWindowBlock = await selectBlock(setup.XRP.entityManager, DBBlockXRP, FIRST_BLOCK);
    let requestXRP = await testConfirmedBlockHeightExistsRequest(
      defStore,
      confirmationBlock,
      lowerQueryWindowBlock,
      ChainType.XRP,
      NUMBER_OF_CONFIRMATIONS_XRP,
      BLOCK_QUERY_WINDOW
    );

    const attestationXRP = prepareAttestation(defStore, requestXRP, setup.startTime);
    await expect(verifierRouter.verifyAttestation(attestationXRP)).to.eventually.be.rejectedWith("Invalid route.");
  });

  it(`Should fail due to verifier not supporting the attestation type`, async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, defStore);

    let confirmationBlock = await selectBlock(setup.BTC.entityManager, DBBlockBTC, BLOCK_CHOICE);
    let lowerQueryWindowBlock = await selectBlock(setup.BTC.entityManager, DBBlockBTC, FIRST_BLOCK);
    let requestBTC = await testConfirmedBlockHeightExistsRequest(
      defStore,
      confirmationBlock,
      lowerQueryWindowBlock,
      ChainType.BTC,
      NUMBER_OF_CONFIRMATIONS_BTC,
      BLOCK_QUERY_WINDOW
    );

    const attestationBTC = prepareAttestation(defStore, requestBTC, setup.startTime);

    try {
      await verifierRouter.verifyAttestation(attestationBTC);
    } catch (e) {
      assert(e.message.startsWith("Unsupported attestation type 'ConfirmedBlockHeightExists'"), "Wrong error message");
    }
    // await sleepMs(10000000)
  });
});

import { BtcTransaction, ChainType, DogeTransaction, prefix0x, toBN, XrpTransaction } from "@flarenetwork/mcc";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { DBBlockBTC, DBBlockXRP } from "../../src/entity/indexer/dbBlock";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { AttestationTypeScheme } from "../../src/verification/attestation-types/attestation-types";
import { readAttestationTypeSchemes, toHex } from "../../src/verification/attestation-types/attestation-types-helpers";
import { AttestationType } from "../../src/verification/generated/attestation-types-enum";
import { VerifierRouteConfig } from "../../src/verification/routing/configs/VerifierRouteConfig";
import { VerifierRouter } from "../../src/verification/routing/VerifierRouter";
import { SourceId } from "../../src/verification/sources/sources";
import {
  firstAddressVin,
  firstAddressVout,
  selectBlock,
  testBalanceDecreasingTransactionRequest,
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
  let definitions: AttestationTypeScheme[];

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
    setup = await bootstrapTestVerifiers(bootstrapOptions, true, true, true, true);
    definitions = await readAttestationTypeSchemes();
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
    await verifierRouter.initialize(verifierConfig, definitions);

    const res = verifierRouter.isSupported(SourceId.ALGO, AttestationType.BalanceDecreasingTransaction);
    assert(!res);
  });

  it("Should not initialize twice", async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, definitions);

    await expect(verifierRouter.initialize(verifierConfig, definitions)).to.be.rejectedWith("Already initialized");
  });

  it("Should not initialize without configuration", async function () {
    const verifierRouter = new VerifierRouter();

    await expect(verifierRouter.initialize(undefined, definitions)).to.be.rejectedWith("Missing configuration");
  });

  it(`Should verify attestation payment`, async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, definitions);

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

  it(`Should not verify corrupt attestation payment`, async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, definitions);

    let requestXRP = await testPaymentRequest(setup.XRP.selectedTransaction, XrpTransaction, ChainType.XRP);
    requestXRP.id = toHex(0, 32);
    const attestationXRP = prepareAttestation(requestXRP, setup.startTime);

    let inUtxo = firstAddressVin(setup.BTC.selectedTransaction);
    let utxo = firstAddressVout(setup.BTC.selectedTransaction);

    let requestBTC = await testPaymentRequest(setup.BTC.selectedTransaction, BtcTransaction, ChainType.BTC, inUtxo, utxo);
    requestBTC.id = toHex(0, 32);
    const attestationBTC = prepareAttestation(requestBTC, setup.startTime);

    let inUtxoDoge = firstAddressVin(setup.Doge.selectedTransaction);
    let utxoDoge = firstAddressVout(setup.Doge.selectedTransaction);

    let requestDoge = await testPaymentRequest(setup.Doge.selectedTransaction, DogeTransaction, ChainType.DOGE, inUtxoDoge, utxoDoge);
    requestDoge.id = toHex(0, 32);
    const attestationDoge = prepareAttestation(requestDoge, setup.startTime);

    let respXRP = await verifierRouter.verifyAttestation(attestationXRP);

    assert(respXRP.status === "NON_EXISTENT_TRANSACTION", "Wrong server response");

    let respBTC = await verifierRouter.verifyAttestation(attestationBTC);
    // console.log("XRP", attestationXRP.data.request, requestXRP)
    // console.log("BTC", attestationBTC.data.request, requestBTC)
    assert(respBTC.status === "NON_EXISTENT_TRANSACTION", "Wrong server response");

    let respDoge = await verifierRouter.verifyAttestation(attestationDoge);
    assert(respDoge.status === "NON_EXISTENT_TRANSACTION", "Wrong server response");
  });

  it(`Should verify attestation BalanceDecreasingTransaction Doge`, async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, definitions);

    let inUtxo = firstAddressVin(setup.Doge.selectedTransaction);

    let requestDoge = await testBalanceDecreasingTransactionRequest(setup.Doge.selectedTransaction, DogeTransaction, ChainType.DOGE, inUtxo);
    const attestationDoge = prepareAttestation(requestDoge, setup.startTime);
    let respDoge = await verifierRouter.verifyAttestation(attestationDoge);

    requestDoge.id = toHex(0, 32);

    const attestationDogeFail = prepareAttestation(requestDoge, setup.startTime);
    let respDogeFail = await verifierRouter.verifyAttestation(attestationDogeFail);

    assert(respDoge.status === "OK", "Wrong server response");
    assert(respDoge.response.transactionHash === prefix0x(setup.Doge.selectedTransaction.transactionId), "Wrong transaction id");

    assert(respDogeFail.status === "NON_EXISTENT_TRANSACTION", "Wrong server response");
  });

  it("Should verify attestation confirmed block height", async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, definitions);
  });

  it(`Should fail due to sending wrong route`, async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, definitions);

    let confirmationBlock = await selectBlock(setup.XRP.entityManager, DBBlockXRP, BLOCK_CHOICE);
    let lowerQueryWindowBlock = await selectBlock(setup.XRP.entityManager, DBBlockXRP, FIRST_BLOCK);
    let requestXRP = await testConfirmedBlockHeightExistsRequest(
      confirmationBlock,
      lowerQueryWindowBlock,
      ChainType.XRP,
      NUMBER_OF_CONFIRMATIONS_XRP,
      BLOCK_QUERY_WINDOW
    );

    const attestationXRP = prepareAttestation(requestXRP, setup.startTime);
    await expect(verifierRouter.verifyAttestation(attestationXRP)).to.eventually.be.rejectedWith("Invalid route.");
  });

  it(`Should fail due to verifier not supporting the attestation type`, async function () {
    const verifierRouter = new VerifierRouter();
    let verifierConfig = await readSecureConfig(new VerifierRouteConfig(), `verifier-client/verifier-routes-${150}`);
    await verifierRouter.initialize(verifierConfig, definitions);

    let confirmationBlock = await selectBlock(setup.BTC.entityManager, DBBlockBTC, BLOCK_CHOICE);
    let lowerQueryWindowBlock = await selectBlock(setup.BTC.entityManager, DBBlockBTC, FIRST_BLOCK);
    let requestBTC = await testConfirmedBlockHeightExistsRequest(
      confirmationBlock,
      lowerQueryWindowBlock,
      ChainType.BTC,
      NUMBER_OF_CONFIRMATIONS_BTC,
      BLOCK_QUERY_WINDOW
    );

    const attestationBTC = prepareAttestation(requestBTC, setup.startTime);

    try {
      await verifierRouter.verifyAttestation(attestationBTC);
    } catch (e) {
      assert(e.message.startsWith("Unsupported attestation type 'ConfirmedBlockHeightExists'"), "Wrong error message");
    }
    // await sleepMs(10000000)
  });
});

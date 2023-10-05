// This should always be on the top of the file, before imports

import { ChainType, MCC, prefix0x, standardAddressHash, XrpTransaction } from "@flarenetwork/mcc";
import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from "@nestjs/testing";

import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { EntityManager } from "typeorm";
import Web3 from "web3";
import { DBBlockXRP } from "../../src/entity/indexer/dbBlock";
import { DBTransactionXRP0 } from "../../src/entity/indexer/dbTransaction";
import { VerifierConfigurationService } from "../../src/servers/verifier-server/src/services/verifier-configuration.service";
import { getUnixEpochTimestamp } from "../../src/utils/helpers/utils";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";
import { EncodedRequestBody } from "../../src/servers/verifier-server/src/dtos/generic/generic.dto";
import { VerifierXrpServerModule } from "../../src/servers/verifier-server/src/verifier-xrp-server.module";
import {
  generateTestIndexerDB,
  selectBlock,
  selectedReferencedTx,
  testBalanceDecreasingTransactionRequest,
  testConfirmedBlockHeightExistsRequest,
  testPaymentRequest,
  testReferencedPaymentNonexistenceRequest,
} from "../indexed-query-manager/utils/indexerTestDataGenerator";
import { getTestFile } from "../test-utils/test-utils";
import { sendToVerifier } from "./utils/server-test-utils";
import { MIC_SALT } from "../../src/external-libs/utils";

chai.use(chaiAsPromised);

const NUMBER_OF_CONFIRMATIONS = 1;
const FIRST_BLOCK = 100;
const LAST_BLOCK = 203;
const LAST_CONFIRMED_BLOCK = 200;
const CHAIN_TYPE = ChainType.XRP;
const DB_BLOCK_TABLE = DBBlockXRP;
const DB_TX_TABLE = DBTransactionXRP0;
const TX_CLASS = XrpTransaction;
const BLOCK_CHOICE = 150;
const TXS_IN_BLOCK = 10;
const BLOCK_QUERY_WINDOW = 40;
const API_KEY = "123456";

describe(`Test ${MCC.getChainTypeName(CHAIN_TYPE)} verifier server (${getTestFile(__filename)})`, () => {
  let app: INestApplication;
  let configurationService: VerifierConfigurationService;
  let entityManager: EntityManager;
  let lastTimestamp: number = 0;
  let startTime: number = 0;
  let selectedTransaction: DBTransactionXRP0;
  let defStore = new AttestationDefinitionStore("configs/type-definitions");

  before(async () => {
    process.env.SECURE_CONFIG_PATH = "./test/server/test-data";
    process.env.NODE_ENV = "development";
    process.env.VERIFIER_TYPE = MCC.getChainTypeName(CHAIN_TYPE).toLowerCase();
    process.env.TEST_IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST = "1";
    process.env.TEST_CREDENTIALS = "1";

    initializeTestGlobalLogger();

    const module = await Test.createTestingModule({
      imports: [VerifierXrpServerModule],
    }).compile();
    app = module.createNestApplication();

    app.useWebSocketAdapter(new WsAdapter(app));

    // unique test logger
    const logger = getGlobalLogger("web");

    configurationService = app.get("VERIFIER_CONFIG") as VerifierConfigurationService;
    entityManager = app.get("indexerDatabaseEntityManager");

    let port = configurationService.config.port;
    await app.listen(port, undefined, () => {
      logger.info(`Server started listening at http://localhost:${configurationService.config.port}`);
      logger.info(`Websocket server started listening at ws://localhost:${configurationService.config.port}`);
    });
    await app.init();

    lastTimestamp = getUnixEpochTimestamp();
    await generateTestIndexerDB(
      CHAIN_TYPE,
      entityManager,
      DB_BLOCK_TABLE,
      DB_TX_TABLE,
      FIRST_BLOCK,
      LAST_BLOCK,
      lastTimestamp,
      LAST_CONFIRMED_BLOCK,
      TXS_IN_BLOCK,
      lastTimestamp
    );
    startTime = lastTimestamp - (LAST_BLOCK - FIRST_BLOCK);
    selectedTransaction = await selectedReferencedTx(entityManager, DB_TX_TABLE, BLOCK_CHOICE);
  });

  after(async () => {
    delete process.env.TEST_IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST;
    delete process.env.TEST_CREDENTIALS;
    delete process.env.SQLITE;
    await app.close();
  });

  it(`Should verify Payment attestation`, async function () {
    let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE);
    let attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequestBody;

    let resp = await sendToVerifier("Payment", "XRP", configurationService, attestationRequest, API_KEY);

    assert(resp.status === "VALID", "Wrong server response");
    assert(resp.response.requestBody.transactionId === prefix0x(selectedTransaction.transactionId), "Wrong transaction id");
    let response = JSON.parse(selectedTransaction.getResponse());
    assert(resp.response.responseBody.sourceAddressHash === Web3.utils.soliditySha3(response.data.result.Account), "Wrong source address");
    assert(resp.response.responseBody.receivingAddressHash === Web3.utils.soliditySha3(response.data.result.Destination), "Wrong receiving address");
    assert(request.messageIntegrityCode === defStore.attestationResponseHash(resp.response, MIC_SALT), "MIC does not match");
  });

  it(`Should verify Balance Decreasing attestation attestation`, async function () {
    let sourceAddressIndicator = standardAddressHash(JSON.parse(selectedTransaction.getResponse()).data.result.Account);
    let request = await testBalanceDecreasingTransactionRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, sourceAddressIndicator);
    let attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequestBody;

    let resp = await sendToVerifier("BalanceDecreasingTransaction", "XRP", configurationService, attestationRequest, API_KEY);

    assert(resp.status === "VALID", "Wrong server response");
    assert(resp.response.requestBody.transactionId === prefix0x(selectedTransaction.transactionId), "Wrong transaction id");
    let response = JSON.parse(selectedTransaction.getResponse());
    assert(resp.response.responseBody.sourceAddressHash === Web3.utils.soliditySha3(response.data.result.Account), "Wrong source address");
    assert(request.messageIntegrityCode === defStore.attestationResponseHash(resp.response, MIC_SALT), "MIC does not match");
  });

  it(`Should not verify corrupt Balance Decreasing attestation attestation`, async function () {
    let sourceAddressIndicator = standardAddressHash(JSON.parse(selectedTransaction.getResponse()).data.result.Account);
    let request = await testBalanceDecreasingTransactionRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, sourceAddressIndicator);

    request.requestBody.transactionId = "0x0000000000000000000000000000000000000000000000000000000000000000";
    let attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequestBody;

    let resp = await sendToVerifier("BalanceDecreasingTransaction", "XRP", configurationService, attestationRequest, API_KEY);

    assert(resp.status === "INVALID", "Wrong server response");
  });

  it(`Should verify Confirmed Block Height Exists attestation`, async function () {
    let confirmedBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE);
    let lowerQueryWindowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE - BLOCK_QUERY_WINDOW - 1);
    let request = await testConfirmedBlockHeightExistsRequest(
      defStore,
      confirmedBlock,
      lowerQueryWindowBlock,
      CHAIN_TYPE,
      NUMBER_OF_CONFIRMATIONS,
      BLOCK_QUERY_WINDOW
    );
    let attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequestBody;

    let resp = await sendToVerifier("ConfirmedBlockHeightExists", "XRP", configurationService, attestationRequest, API_KEY);

    assert(resp.status === "VALID", "Wrong server response");
    assert(BigInt(resp.response.responseBody.blockNumber) === BigInt(BLOCK_CHOICE), "Wrong block number");
    assert(BigInt(resp.response.responseBody.lowestQueryWindowBlockNumber) === BigInt(BLOCK_CHOICE - BLOCK_QUERY_WINDOW - 1), "Wrong lowest query window block number");
    assert(request.messageIntegrityCode === defStore.attestationResponseHash(resp.response, MIC_SALT), "MIC does not match");
  });

  it(`Should not verify corrupt Confirmed Block Height Exists attestation`, async function () {
    let confirmedBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE);
    confirmedBlock.blockNumber = 300;
    let lowerQueryWindowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE - BLOCK_QUERY_WINDOW - 1);
    let request = await testConfirmedBlockHeightExistsRequest(
      defStore,
      confirmedBlock,
      lowerQueryWindowBlock,
      CHAIN_TYPE,
      NUMBER_OF_CONFIRMATIONS,
      BLOCK_QUERY_WINDOW
    );
    let attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequestBody;

      let resp = await sendToVerifier("ConfirmedBlockHeightExists", "XRP", configurationService, attestationRequest, API_KEY);
      assert(resp.status === "INDETERMINATE", "Wrong server response");
      expect(resp.response).to.be.undefined;
    });

  it(`Should fail to provide Referenced Payment Nonexistence attestation`, async function () {
    let response = JSON.parse(selectedTransaction.getResponse());
    let firstOverflowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE + 3);
    let lowerQueryWindowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, FIRST_BLOCK + 1);

    let request = await testReferencedPaymentNonexistenceRequest(
      defStore,
      [selectedTransaction],
      TX_CLASS,
      firstOverflowBlock,
      lowerQueryWindowBlock,
      CHAIN_TYPE,
      BLOCK_CHOICE + 1,
      selectedTransaction.timestamp + 2,
      response.data.result.Destination,
      prefix0x(selectedTransaction.paymentReference),
      parseInt(response.data.result.Amount)
    );

    let attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequestBody;

    let resp = await sendToVerifier("ReferencedPaymentNonexistence", "XRP", configurationService, attestationRequest, API_KEY);
    assert(resp.status === "INVALID", "Wrong server response");
  });

  it(`Should verify Referenced Payment Nonexistence attestation`, async function () {
    let response = JSON.parse(selectedTransaction.getResponse());

    let firstOverflowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE - 1);
    let lowerQueryWindowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, FIRST_BLOCK);

    let request = await testReferencedPaymentNonexistenceRequest(
      defStore,
      [],
      TX_CLASS,
      firstOverflowBlock,
      lowerQueryWindowBlock,
      CHAIN_TYPE,
      BLOCK_CHOICE - 3,
      selectedTransaction.timestamp - 2,
      response.data.result.Destination,
      prefix0x(selectedTransaction.paymentReference),
      parseInt(response.data.result.Amount)
    );

    let attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequestBody;

    let resp = await sendToVerifier("ReferencedPaymentNonexistence", "XRP", configurationService, attestationRequest, API_KEY);

    assert(resp.status === "VALID", "Wrong server response");
    assert(BigInt(resp.response.responseBody.firstOverflowBlockNumber) === BigInt(BLOCK_CHOICE - 1), "Incorrect first overflow block");
    assert(BigInt(resp.response.responseBody.firstOverflowBlockTimestamp) === BigInt(selectedTransaction.timestamp - 1), "Incorrect first overflow block timestamp");
    assert(request.messageIntegrityCode === defStore.attestationResponseHash(resp.response, MIC_SALT), "MIC does not match");
  });

  // it(`Should return correct supported source and types`, async function () {
  //   let processor = app.get("VERIFIER_PROCESSOR") as VerifierProcessor;
  //   assert(processor.supportedSource() === MCC.getChainTypeName(CHAIN_TYPE).toUpperCase(), `Supported source should be ${MCC.getChainTypeName(CHAIN_TYPE).toUpperCase()}`);
  //   let supported = processor.supportedAttestationTypes();
  //   assert(supported.indexOf("Payment") >= 0, "Payment should be supported");
  //   assert(supported.indexOf("BalanceDecreasingTransaction") >= 0, "BalanceDecreasingTransaction should be supported");
  // });
});

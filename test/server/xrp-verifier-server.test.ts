// This should always be on the top of the file, before imports

import { ChainType, prefix0x, standardAddressHash, toHex, XrpTransaction } from "@flarenetwork/mcc";
import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from "@nestjs/testing";
import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import { EntityManager } from "typeorm";
import Web3 from "web3";
import { DBBlockXRP } from "../../src/entity/indexer/dbBlock";
import { DBTransactionXRP0 } from "../../src/entity/indexer/dbTransaction";
import { VerifierConfigurationService } from "../../src/servers/verifier-server/src/services/verifier-configuration.service";
import { VerifierProcessor } from "../../src/servers/verifier-server/src/services/verifier-processors/verifier-processor";
import { VerifierServerModule } from "../../src/servers/verifier-server/src/verifier-server.module";
import { getUnixEpochTimestamp } from "../../src/utils/helpers/utils";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { AttestationRequest, MIC_SALT } from "../../src/verification/attestation-types/attestation-types";
import { AttestationDefinitionStore } from "../../src/verification/attestation-types/AttestationDefinitionStore";
import { getSourceName } from "../../src/verification/sources/sources";
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

describe(`Test ${getSourceName(CHAIN_TYPE)} verifier server (${getTestFile(__filename)})`, () => {
  let app: INestApplication;
  let configurationService: VerifierConfigurationService;
  let entityManager: EntityManager;
  let lastTimestamp: number = 0;
  let startTime: number = 0;
  let selectedTransaction: DBTransactionXRP0;
  let defStore = new AttestationDefinitionStore()
  before(async () => {
    await defStore.initialize();
    process.env.SECURE_CONFIG_PATH = "./test/server/test-data";
    process.env.NODE_ENV = "development";
    process.env.VERIFIER_TYPE = getSourceName(CHAIN_TYPE).toLowerCase();
    process.env.TEST_IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST = "1";
    process.env.TEST_CREDENTIALS = "1";

    initializeTestGlobalLogger();

    const module = await Test.createTestingModule({
      imports: [VerifierServerModule],
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
    await app.close();
  });

  it(`Should verify Payment attestation`, async function () {
    let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE);
    let attestationRequest = {
      request: defStore.encodeRequest(request),
      options: {},
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.response.transactionHash === prefix0x(selectedTransaction.transactionId), "Wrong transaction id");
    let response = JSON.parse(selectedTransaction.response);
    assert(resp.data.response.sourceAddressHash === Web3.utils.soliditySha3(response.data.result.Account), "Wrong source address");
    assert(resp.data.response.receivingAddressHash === Web3.utils.soliditySha3(response.data.result.Destination), "Wrong receiving address");
    assert(request.messageIntegrityCode === defStore.dataHash(request, resp.data.response, MIC_SALT), "MIC does not match");
  });

  it(`Should verify Balance Decreasing attestation attestation`, async function () {
    let sourceAddressIndicator = standardAddressHash(JSON.parse(selectedTransaction.response).data.result.Account);
    let request = await testBalanceDecreasingTransactionRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, sourceAddressIndicator);
    let attestationRequest = {
      request: defStore.encodeRequest(request),
      options: {
        roundId: 1,
      },
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.response.transactionHash === prefix0x(selectedTransaction.transactionId), "Wrong transaction id");
    let response = JSON.parse(selectedTransaction.response);
    assert(resp.data.response.sourceAddressHash === Web3.utils.soliditySha3(response.data.result.Account), "Wrong source address");
    assert(request.messageIntegrityCode === defStore.dataHash(request, resp.data.response, MIC_SALT), "MIC does not match");
  });

  it(`Should not verify corrupt Balance Decreasing attestation attestation`, async function () {
    let sourceAddressIndicator = standardAddressHash(JSON.parse(selectedTransaction.response).data.result.Account);
    let request = await testBalanceDecreasingTransactionRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, sourceAddressIndicator);

    request.id = "0x0000000000000000000000000000000000000000000000000000000000000000";
    let attestationRequest = {
      request: defStore.encodeRequest(request),
      options: {
        roundId: 1,
      },
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.status === "NON_EXISTENT_TRANSACTION");
  });

  it(`Should verify Confirmed Block Height Exists attestation`, async function () {
    let confirmedBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE);
    let lowerQueryWindowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE - BLOCK_QUERY_WINDOW - 1);
    let request = await testConfirmedBlockHeightExistsRequest(defStore, confirmedBlock, lowerQueryWindowBlock, CHAIN_TYPE, NUMBER_OF_CONFIRMATIONS, BLOCK_QUERY_WINDOW);
    let attestationRequest = {
      request: defStore.encodeRequest(request),
      options: {
        roundId: 1,
      },
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.response.blockNumber === toHex(BLOCK_CHOICE), "Wrong block number");
    assert(resp.data.response.lowestQueryWindowBlockNumber === toHex(BLOCK_CHOICE - BLOCK_QUERY_WINDOW - 1), "Wrong lowest query window block number");
    assert(request.messageIntegrityCode === defStore.dataHash(request, resp.data.response, MIC_SALT), "MIC does not match");
  });

  it(`Should not verify corrupt Confirmed Block Height Exists attestation`, async function () {
    let confirmedBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE);
    confirmedBlock.blockNumber = 300;
    let lowerQueryWindowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE - BLOCK_QUERY_WINDOW - 1);
    let request = await testConfirmedBlockHeightExistsRequest(defStore, confirmedBlock, lowerQueryWindowBlock, CHAIN_TYPE, NUMBER_OF_CONFIRMATIONS, BLOCK_QUERY_WINDOW);
    let attestationRequest = {
      request: defStore.encodeRequest(request),
      options: {
        roundId: 1,
      },
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.status === "NON_EXISTENT_BLOCK", "Wrong status response");
  });

  it(`Should fail to provide Referenced Payment Nonexistence attestation`, async function () {
    let response = JSON.parse(selectedTransaction.response);
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
      request: defStore.encodeRequest(request),
      options: {},
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.status === "REFERENCED_TRANSACTION_EXISTS", "Did not manage to find referenced transaction");
  });

  it(`Should verify Referenced Payment Nonexistence attestation`, async function () {
    let response = JSON.parse(selectedTransaction.response);

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
      request: defStore.encodeRequest(request),
      options: {
        roundId: 1,
      },
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.status === "OK", "Status is not OK");
    assert(resp.data.response.firstOverflowBlockNumber === toHex(BLOCK_CHOICE - 1), "Incorrect first overflow block");
    assert(resp.data.response.firstOverflowBlockTimestamp === toHex(selectedTransaction.timestamp - 1), "Incorrect first overflow block timestamp");
    assert(request.messageIntegrityCode === defStore.dataHash(request, resp.data.response, MIC_SALT), "MIC does not match");
  });

  it(`Should return correct supported source and types`, async function () {
    let processor = app.get("VERIFIER_PROCESSOR") as VerifierProcessor;
    assert(processor.supportedSource() === getSourceName(CHAIN_TYPE).toUpperCase(), `Supported source should be ${getSourceName(CHAIN_TYPE).toUpperCase()}`);
    let supported = processor.supportedAttestationTypes();
    assert(supported.indexOf("Payment") >= 0, "Payment should be supported");
    assert(supported.indexOf("BalanceDecreasingTransaction") >= 0, "BalanceDecreasingTransaction should be supported");
  });
});

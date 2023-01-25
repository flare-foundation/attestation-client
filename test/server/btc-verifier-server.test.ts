// This should always be on the top of the file, before imports
import { BtcTransaction, ChainType, prefix0x, toBN, toHex } from "@flarenetwork/mcc";
import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from '@nestjs/testing';
import chai, { assert, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { EntityManager } from "typeorm";
import Web3 from "web3";
import { DBBlockBTC } from "../../src/entity/indexer/dbBlock";
import { DBTransactionBTC0, DBTransactionXRP0 } from "../../src/entity/indexer/dbTransaction";
import { VerifierConfigurationService } from "../../src/servers/verifier-server/src/services/verifier-configuration.service";
import { VerifierProcessor } from "../../src/servers/verifier-server/src/services/verifier-processors/verifier-processor";
import { VerifierServerModule } from "../../src/servers/verifier-server/src/verifier-server.module";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logger";
import { getUnixEpochTimestamp } from "../../src/utils/utils";
import { AttestationRequest, MIC_SALT } from "../../src/verification/attestation-types/attestation-types";
import { WsClientOptions } from "../../src/verification/client/WsClientOptions";
import { hashBalanceDecreasingTransaction, hashConfirmedBlockHeightExists, hashPayment, hashReferencedPaymentNonexistence } from "../../src/verification/generated/attestation-hash-utils";
import { encodeBalanceDecreasingTransaction, encodeConfirmedBlockHeightExists, encodePayment, encodeReferencedPaymentNonexistence } from "../../src/verification/generated/attestation-request-encode";
import { getSourceName } from "../../src/verification/sources/sources";
import { addressOnVout, firstAddressVin, firstAddressVout, generateTestIndexerDB, selectBlock, selectedReferencedTx, testBalanceDecreasingTransactionRequest, testConfirmedBlockHeightExistsRequest, testPaymentRequest, testReferencedPaymentNonexistenceRequest, totalDeliveredAmountToAddress } from "../indexed-query-manager/utils/indexerTestDataGenerator";
import { getTestFile } from "../test-utils/test-utils";
import { sendToVerifier } from "./utils/server-test-utils";

chai.use(chaiAsPromised);

const WS_URL = `ws://localhost:9500?apiKey=7890`;

const defaultWsClientOptions: WsClientOptions = new WsClientOptions();
defaultWsClientOptions.url = WS_URL;

const NUMBER_OF_CONFIRMATIONS = 6;
const FIRST_BLOCK = 100;
const LAST_BLOCK = 203;
const LAST_CONFIRMED_BLOCK = 200;
const CHAIN_TYPE = ChainType.BTC;
const DB_BLOCK_TABLE = DBBlockBTC;
const DB_TX_TABLE = DBTransactionBTC0;
const TX_CLASS = BtcTransaction;
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

  before(async () => {
    process.env.CONFIG_PATH = "../test/server/test-data/test-verifier";
    process.env.NODE_ENV = "development";
    process.env.VERIFIER_TYPE = getSourceName(CHAIN_TYPE).toLowerCase();
    process.env.TEST_IN_MEMORY_DB = "1";
    process.env.TEST_IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST = "1";
    process.env.TEST_CREDENTIALS = "1"

    initializeTestGlobalLogger();

    const module = await Test.createTestingModule({
      imports: [VerifierServerModule],
    }).compile();
    app = module.createNestApplication();

    app.useWebSocketAdapter(new WsAdapter(app));

    // unique test logger
    const logger = getGlobalLogger("web");

    configurationService = app.get("VERIFIER_CONFIG") as VerifierConfigurationService;
    entityManager = app.get("indexerDatabaseEntityManager")

    let port = configurationService.config.port;
    await app.listen(port, undefined, () => {
      logger.info(`Server started listening at http://localhost:${configurationService.config.port}`);
      logger.info(`Websocket server started listening at ws://localhost:${configurationService.config.port}`)
    })
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
    let inUtxo = firstAddressVin(selectedTransaction);
    let utxo = firstAddressVout(selectedTransaction);
    let request = await testPaymentRequest(selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

    let attestationRequest = {
      request: encodePayment(request),
      options: {
      }
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.response.transactionHash === prefix0x(selectedTransaction.transactionId), "Wrong transaction id");
    let response = JSON.parse(selectedTransaction.response);
    let sourceAddress = response.additionalData.vinouts[inUtxo].vinvout.scriptPubKey.address;
    let receivingAddress = response.data.vout[utxo].scriptPubKey.address;
    assert(resp.data.response.sourceAddressHash === Web3.utils.soliditySha3(sourceAddress), "Wrong source address");
    assert(resp.data.response.receivingAddressHash === Web3.utils.soliditySha3(receivingAddress), "Wrong receiving address");
    assert(request.messageIntegrityCode === hashPayment(request, resp.data.response, MIC_SALT), "MIC does not match")
  });

  it(`Should verify Balance Decreasing attestation attestation`, async function () {
    let inUtxo = firstAddressVin(selectedTransaction);
    let request = await testBalanceDecreasingTransactionRequest(selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo);
    let attestationRequest = {
      request: encodeBalanceDecreasingTransaction(request),
      options: {
        roundId: 1,
      }
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.response.transactionHash === prefix0x(selectedTransaction.transactionId), "Wrong transaction id");
    let response = JSON.parse(selectedTransaction.response);
    let sourceAddress = response.additionalData.vinouts[inUtxo].vinvout.scriptPubKey.address;
    assert(resp.data.response.sourceAddressHash === Web3.utils.soliditySha3(sourceAddress), "Wrong source address");
    assert(request.messageIntegrityCode === hashBalanceDecreasingTransaction(request, resp.data.response, MIC_SALT), "MIC does not match")
  });

  it(`Should verify Confirmed Block Height Exists attestation`, async function () {
    let confirmedBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE);
    let lowerQueryWindowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE - BLOCK_QUERY_WINDOW - 1);
    let request = await testConfirmedBlockHeightExistsRequest(confirmedBlock, lowerQueryWindowBlock, CHAIN_TYPE, NUMBER_OF_CONFIRMATIONS, BLOCK_QUERY_WINDOW);
    let attestationRequest = {
      request: encodeConfirmedBlockHeightExists(request),
      options: {
        roundId: 1,
      }
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);
    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.response.blockNumber === toHex(BLOCK_CHOICE), "Wrong block number");
    assert(resp.data.response.lowestQueryWindowBlockNumber === toHex(BLOCK_CHOICE - BLOCK_QUERY_WINDOW - 1), "Wrong lowest query window block number");
    assert(request.messageIntegrityCode === hashConfirmedBlockHeightExists(request, resp.data.response, MIC_SALT), "MIC does not match")
  });

  it(`Should fail to provide Referenced Payment Nonexistence attestation`, async function () {
    let utxo = firstAddressVout(selectedTransaction, 1);
    let receivingAddress = addressOnVout(selectedTransaction, utxo);
    let receivedAmount = totalDeliveredAmountToAddress(selectedTransaction, receivingAddress);
    let firstOverflowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE + 3);
    let lowerQueryWindowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, FIRST_BLOCK + 1);

    let request = await testReferencedPaymentNonexistenceRequest(
      [selectedTransaction],
      TX_CLASS,
      firstOverflowBlock,
      lowerQueryWindowBlock,
      CHAIN_TYPE,
      BLOCK_CHOICE + 1,
      selectedTransaction.timestamp + 2,
      receivingAddress,
      prefix0x(selectedTransaction.paymentReference),
      receivedAmount
    );

    let attestationRequest = {
      request: encodeReferencedPaymentNonexistence(request),
      options: {
      }
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.status === "REFERENCED_TRANSACTION_EXISTS", "Did not manage to find referenced transaction");
  });

  it(`Should verify Referenced Payment Nonexistence attestation`, async function () {
    let utxo = firstAddressVout(selectedTransaction, 1);
    let receivingAddress = addressOnVout(selectedTransaction, utxo);
    let receivedAmount = totalDeliveredAmountToAddress(selectedTransaction, receivingAddress);

    let firstOverflowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE - 1);
    let lowerQueryWindowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, FIRST_BLOCK);

    let request = await testReferencedPaymentNonexistenceRequest(
      [],
      TX_CLASS,
      firstOverflowBlock,
      lowerQueryWindowBlock,
      CHAIN_TYPE,
      BLOCK_CHOICE - 3,
      selectedTransaction.timestamp - 2,
      receivingAddress,
      prefix0x(selectedTransaction.paymentReference),
      receivedAmount.add(toBN(1))
    );

    let attestationRequest = {
      request: encodeReferencedPaymentNonexistence(request),
      options: {
        roundId: 1,
      }
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.status === "OK", "Status is not OK");
    assert(resp.data.response.firstOverflowBlockNumber === toHex(BLOCK_CHOICE - 1), "Incorrect first overflow block");
    assert(resp.data.response.firstOverflowBlockTimestamp === toHex(selectedTransaction.timestamp - 1), "Incorrect first overflow block timestamp");
    assert(request.messageIntegrityCode === hashReferencedPaymentNonexistence(request, resp.data.response, MIC_SALT), "MIC does not match")

  });

  it(`Should fail to provide Referenced Payment Nonexistence with negative value`, async function () {
    let utxo = firstAddressVout(selectedTransaction, 0);
    let receivingAddress = addressOnVout(selectedTransaction, utxo);
    let receivedAmount = totalDeliveredAmountToAddress(selectedTransaction, receivingAddress);

    let firstOverflowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE + 3);
    let lowerQueryWindowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, FIRST_BLOCK);

    let request = await testReferencedPaymentNonexistenceRequest(
      [selectedTransaction],
      TX_CLASS,
      firstOverflowBlock,
      lowerQueryWindowBlock,
      CHAIN_TYPE,
      BLOCK_CHOICE + 1,
      selectedTransaction.timestamp + 2,
      receivingAddress,
      prefix0x(selectedTransaction.paymentReference),
      receivedAmount
    );

    expect(() => encodeReferencedPaymentNonexistence(request)).to.throw("Negative values are not supported in attestation requests")
  });

  it(`Should return correct supported source and types`, async function () {
    let processor = app.get("VERIFIER_PROCESSOR") as VerifierProcessor;
    assert(processor.supportedSource() === getSourceName(CHAIN_TYPE).toUpperCase(), `Supported source should be ${getSourceName(CHAIN_TYPE).toUpperCase()}`);
    let supported = processor.supportedAttestationTypes();
    assert(supported.indexOf("Payment") >= 0, "Payment shoud be supported")
    assert(supported.indexOf("BalanceDecreasingTransaction") >= 0, "BalanceDecreasingTransaction shoud be supported")
  });

});

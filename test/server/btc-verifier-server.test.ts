// This should always be on the top of the file, before imports
import { ChainType, prefix0x, toBN, toHex } from "@flarenetwork/mcc";
import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from '@nestjs/testing';
import chai, { assert, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { EntityManager } from "typeorm";
import Web3 from "web3";
import { DBBlockBTC } from "../../lib/entity/indexer/dbBlock";
import { DBTransactionBTC0, DBTransactionXRP0 } from "../../lib/entity/indexer/dbTransaction";
import { VerifierConfigurationService } from "../../lib/servers/verifier-server/src/services/verifier-configuration.service";
import { VerifierProcessor } from "../../lib/servers/verifier-server/src/services/verifier-processors/verifier-processor";
import { VerifierServerModule } from "../../lib/servers/verifier-server/src/verifier-server.module";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { getUnixEpochTimestamp } from "../../lib/utils/utils";
import { AttestationRequest } from "../../lib/verification/attestation-types/attestation-types";
import { WsClientOptions } from "../../lib/verification/client/WsClientOptions";
import { encodeBalanceDecreasingTransaction, encodeConfirmedBlockHeightExists, encodePayment, encodeReferencedPaymentNonexistence } from "../../lib/verification/generated/attestation-request-encode";
import { getSourceName } from "../../lib/verification/sources/sources";
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
const BLOCK_CHOICE = 150;
const TXS_IN_BLOCK = 10;
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
    process.env.IN_MEMORY_DB = "1";
    process.env.IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST = "1";

    initializeTestGlobalLogger();
    const module = await Test.createTestingModule({
      imports: [VerifierServerModule],
    }).compile();
    app = module.createNestApplication();

    app.useWebSocketAdapter(new WsAdapter(app));

    // unique test logger
    const logger = getGlobalLogger("web");

    configurationService = app.get(VerifierConfigurationService);
    entityManager = app.get("indexerDatabaseEntityManager")

    let port = configurationService.wsServerConfiguration.port;
    await app.listen(port, undefined, () => {
      logger.info(`Server started listening at http://localhost:${configurationService.wsServerConfiguration.port}`);
      logger.info(`Websocket server started listening at ws://localhost:${configurationService.wsServerConfiguration.port}`)
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

  it(`Should verify Payment attestation`, async function () {
    let inUtxo = firstAddressVin(selectedTransaction);
    let utxo = firstAddressVout(selectedTransaction);
    let request = await testPaymentRequest(entityManager, selectedTransaction, DB_BLOCK_TABLE, NUMBER_OF_CONFIRMATIONS, CHAIN_TYPE, inUtxo, utxo);
    // console.log(request)
    let attestationRequest = {
      request: encodePayment(request),
      options: {
        roundId: 1,
        recheck: false,
        windowStartTime: startTime + 1, // must exist one block with timestamp lower
        UBPCutoffTime: startTime
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
  });

  it(`Should verify Balance Decreasing attestation attestation`, async function () {
    let inUtxo = firstAddressVin(selectedTransaction);
    let request = await testBalanceDecreasingTransactionRequest(entityManager, selectedTransaction, DB_BLOCK_TABLE, NUMBER_OF_CONFIRMATIONS, CHAIN_TYPE, inUtxo);
    let attestationRequest = {
      request: encodeBalanceDecreasingTransaction(request),
      options: {
        roundId: 1,
        recheck: false,
        windowStartTime: startTime + 1, // must exist one block with timestamp lower
        UBPCutoffTime: startTime
      }
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.response.transactionHash === prefix0x(selectedTransaction.transactionId), "Wrong transaction id");
    let response = JSON.parse(selectedTransaction.response);
    let sourceAddress = response.additionalData.vinouts[inUtxo].vinvout.scriptPubKey.address;
    assert(resp.data.response.sourceAddressHash === Web3.utils.soliditySha3(sourceAddress), "Wrong source address");
  });

  it(`Should verify Confirmed Block Height Exists attestation`, async function () {
    let confirmationBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE);
    let request = await testConfirmedBlockHeightExistsRequest(confirmationBlock, CHAIN_TYPE);
    let attestationRequest = {
      request: encodeConfirmedBlockHeightExists(request),
      options: {
        roundId: 1,
        recheck: false,
        windowStartTime: startTime + 1, // must exist one block with timestamp lower
        UBPCutoffTime: startTime
      }
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.response.blockNumber === toHex(BLOCK_CHOICE - NUMBER_OF_CONFIRMATIONS + 1), "Wrong block number");
    assert(resp.data.response.lowestQueryWindowBlockNumber === toHex(101), "Wrong lowest query window block number");
  });

  it(`Should fail to provide Referenced Payment Nonexistence attestation`, async function () {
    let utxo = firstAddressVout(selectedTransaction, 1);
    let receivingAddress = addressOnVout(selectedTransaction, utxo);
    let receivedAmount = totalDeliveredAmountToAddress(selectedTransaction, receivingAddress);
    let request = await testReferencedPaymentNonexistenceRequest(
      entityManager, BLOCK_CHOICE + NUMBER_OF_CONFIRMATIONS + 5, DB_BLOCK_TABLE, CHAIN_TYPE, BLOCK_CHOICE + 1,
      selectedTransaction.timestamp + 2, receivingAddress, receivedAmount, prefix0x(selectedTransaction.paymentReference));

    let attestationRequest = {
      request: encodeReferencedPaymentNonexistence(request),
      options: {
        roundId: 1,
        recheck: false,
        windowStartTime: startTime + 1, // must exist one block with timestamp lower
        UBPCutoffTime: startTime
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

    let request = await testReferencedPaymentNonexistenceRequest(entityManager, BLOCK_CHOICE + NUMBER_OF_CONFIRMATIONS + 5,
      DB_BLOCK_TABLE, CHAIN_TYPE, BLOCK_CHOICE + 1, selectedTransaction.timestamp + 2,
      receivingAddress, receivedAmount.add(toBN(1)), prefix0x(selectedTransaction.paymentReference));

    let attestationRequest = {
      request: encodeReferencedPaymentNonexistence(request),
      options: {
        roundId: 1,
        recheck: false,
        windowStartTime: startTime + 1, // must exist one block with timestamp lower
        UBPCutoffTime: startTime
      }
    } as AttestationRequest;

    let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

    assert(resp.status === "OK", "Wrong server response");
    assert(resp.data.status === "OK", "Status is not OK");
    assert(resp.data.response.firstOverflowBlockNumber === toHex(BLOCK_CHOICE + 3), "Incorrect first overflow block");
    assert(resp.data.response.firstOverflowBlockTimestamp === toHex(selectedTransaction.timestamp + 3), "Incorrect first overflow block timestamp");
  });

  it(`Should fail to provide Referenced Payment Nonexistence with negative value`, async function () {
    let utxo = firstAddressVout(selectedTransaction, 0);
    let receivingAddress = addressOnVout(selectedTransaction, utxo);
    let receivedAmount = totalDeliveredAmountToAddress(selectedTransaction, receivingAddress);
    let request = await testReferencedPaymentNonexistenceRequest(
      entityManager, BLOCK_CHOICE + NUMBER_OF_CONFIRMATIONS + 5, DB_BLOCK_TABLE, CHAIN_TYPE, BLOCK_CHOICE + 1,
      selectedTransaction.timestamp + 2, receivingAddress, receivedAmount, prefix0x(selectedTransaction.paymentReference));

    expect(() => encodeReferencedPaymentNonexistence(request)).to.throw("Negative values are not supported in attestation requests")
  });

  it(`Should return correct supported source and types`, async function () {
    let processor = app.get("VERIFIER_PROCESSOR") as VerifierProcessor;
    assert(processor.supportedSource() === getSourceName(CHAIN_TYPE).toUpperCase(), `Supported source should be ${getSourceName(CHAIN_TYPE).toUpperCase()}`);
    let supported = processor.supportedAttestationTypes();
    assert(supported.indexOf("Payment") >= 0, "Payment shoud be supported")
    assert(supported.indexOf("BalanceDecreasingTransaction") >= 0, "BalanceDecreasingTransaction shoud be supported")
  });

  after(async () => {
    delete process.env.IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST;
    await app.close();
  });

});

// This should always be on the top of the file, before imports

import { ChainType, prefix0x, toHex } from "@flarenetwork/mcc";
import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from '@nestjs/testing';
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { EntityManager } from "typeorm";
import Web3 from "web3";
import { DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { DBTransactionXRP0 } from "../../lib/entity/indexer/dbTransaction";
import { WSServerConfigurationService } from "../../lib/servers/common/src";
import { VerifierProcessor } from "../../lib/servers/ws-server/src/services/verifier-processors/verifier-processor";
import { XRPProcessorService } from "../../lib/servers/ws-server/src/services/verifier-processors/xrp-processor.service";
import { WsServerModule } from "../../lib/servers/ws-server/src/ws-server.module";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { IIdentifiable } from "../../lib/utils/PromiseRequestManager";
import { getUnixEpochTimestamp } from "../../lib/utils/utils";
import { AttestationRequest } from "../../lib/verification/attestation-types/attestation-types";
import { WsClientOptions } from "../../lib/verification/client/WsClientOptions";
import { encodeBalanceDecreasingTransaction, encodeConfirmedBlockHeightExists, encodePayment, encodeReferencedPaymentNonexistence } from "../../lib/verification/generated/attestation-request-encode";
import { getSourceName } from "../../lib/verification/sources/sources";
import { generateTestIndexerDB, selectBlock, selectedReferencedTx, testBalanceDecreasingTransactionRequest, testConfirmedBlockHeightExistsRequest, testPaymentRequest, testReferencedPaymentNonexistenceRequest } from "../indexed-query-manager/utils/indexerTestDataGenerator";
import { getTestFile } from "../test-utils/test-utils";
import { sendToVerifier } from "./utils/server-test-utils";

chai.use(chaiAsPromised);

const WS_URL = `ws://localhost:9500?apiKey=7890`;

const defaultWsClientOptions: WsClientOptions = new WsClientOptions();
defaultWsClientOptions.url = WS_URL;

const NUMBER_OF_CONFIRMATIONS = 1;
const FIRST_BLOCK = 100;
const LAST_BLOCK = 203;
const LAST_CONFIRMED_BLOCK = 200;
const CHAIN_TYPE = ChainType.XRP;
const DB_BLOCK_TABLE = DBBlockXRP;
const DB_TX_TABLE = DBTransactionXRP0;
const BLOCK_CHOICE = 150;
const TXS_IN_BLOCK = 10;
const API_KEY = "123456";

interface TestData extends IIdentifiable {
  a: number;
  b: string;
}

describe(`Test ${getSourceName(CHAIN_TYPE)} verifier server (${getTestFile(__filename)})`, () => {

  let app: INestApplication;
  let configurationService: WSServerConfigurationService;
  let entityManager: EntityManager;
  let lastTimestamp: number = 0;
  let startTime: number = 0;
  let selectedTransaction: DBTransactionXRP0;

  before(async () => {
    process.env.CONFIG_PATH = "../test/server/test-data/test-verifier";
    process.env.NODE_ENV = "development";
    process.env.VERIFIER_TYPE = getSourceName(CHAIN_TYPE).toLowerCase();
    process.env.IN_MEMORY_DB = "1";

    initializeTestGlobalLogger();

    const module = await Test.createTestingModule({
      imports: [WsServerModule],
    }).compile();
    app = module.createNestApplication();

    app.useWebSocketAdapter(new WsAdapter(app));

    // unique test logger
    const logger = getGlobalLogger("web");

    configurationService = app.get(WSServerConfigurationService);
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
    let request = await testPaymentRequest(entityManager, selectedTransaction, DB_BLOCK_TABLE, NUMBER_OF_CONFIRMATIONS, CHAIN_TYPE);
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
    assert(resp.data.response.sourceAddressHash === Web3.utils.soliditySha3(response.data.result.Account), "Wrong source address");
    assert(resp.data.response.receivingAddressHash === Web3.utils.soliditySha3(response.data.result.Destination), "Wrong receiving address");
  });

  it(`Should verify Balance Decreasing attestation attestation`, async function () {
    let request = await testBalanceDecreasingTransactionRequest(entityManager, selectedTransaction, DB_BLOCK_TABLE, NUMBER_OF_CONFIRMATIONS, CHAIN_TYPE);
    // console.log(request)
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
    assert(resp.data.response.sourceAddressHash === Web3.utils.soliditySha3(response.data.result.Account), "Wrong source address");
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
    let response = JSON.parse(selectedTransaction.response);
    let request = await testReferencedPaymentNonexistenceRequest(entityManager, BLOCK_CHOICE + NUMBER_OF_CONFIRMATIONS + 5, DB_BLOCK_TABLE, CHAIN_TYPE, BLOCK_CHOICE + 1, selectedTransaction.timestamp + 2, response.data.result.Destination, parseInt(response.data.result.Amount), prefix0x(selectedTransaction.paymentReference));

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
    let response = JSON.parse(selectedTransaction.response);
    let request = await testReferencedPaymentNonexistenceRequest(entityManager, BLOCK_CHOICE + NUMBER_OF_CONFIRMATIONS + 5, DB_BLOCK_TABLE, CHAIN_TYPE, BLOCK_CHOICE + 1, selectedTransaction.timestamp + 2, response.data.result.Destination, parseInt(response.data.result.Amount) + 1, prefix0x(selectedTransaction.paymentReference));

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


  it(`Should return correct supported source and types`, async function () {
    let processor = app.get("VERIFIER_PROCESSOR") as VerifierProcessor;
    assert(processor.supportedSource() === getSourceName(CHAIN_TYPE).toUpperCase(), `Supported source should be ${getSourceName(CHAIN_TYPE).toUpperCase()}`);
    let supported = processor.supportedAttestationTypes();
    assert(supported.indexOf("Payment") >= 0, "Payment shoud be supported")
    assert(supported.indexOf("BalanceDecreasingTransaction") >= 0, "BalanceDecreasingTransaction shoud be supported")
  });

  after(async () => {
    await app.close();
  });

});

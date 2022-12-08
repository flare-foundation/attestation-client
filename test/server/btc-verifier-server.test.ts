// This should always be on the top of the file, before imports
process.env.CONFIG_PATH = "test-verifier";
process.env.NODE_ENV = "development";
process.env.VERIFIER_TYPE = "btc";
process.env.IN_MEMORY_DB = "1";

import { ChainType, prefix0x } from "@flarenetwork/mcc";
import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from '@nestjs/testing';
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { EntityManager } from "typeorm";
import { DBBlockBTC, DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { DBTransactionBTC0, DBTransactionXRP0 } from "../../lib/entity/indexer/dbTransaction";
import { WSServerConfigurationService } from "../../lib/servers/common/src";
import { WsServerModule } from "../../lib/servers/ws-server/src/ws-server.module";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { IIdentifiable } from "../../lib/utils/PromiseRequestManager";
import { getUnixEpochTimestamp } from "../../lib/utils/utils";
import { AttestationRequest } from "../../lib/verification/attestation-types/attestation-types";
import { WsClientOptions } from "../../lib/verification/client/WsClientOptions";
import { encodePayment } from "../../lib/verification/generated/attestation-request-encode";
import { generateTestIndexerDB, selectedReferencedTx, testPaymentRequest } from "../indexed-query-manager/utils/indexerTestDataGenerator";

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


interface TestData extends IIdentifiable {
  a: number;
  b: string;
}

const axios = require("axios");

describe("Test websocket verifier server ", () => {

  let app: INestApplication;
  let configurationService: WSServerConfigurationService;
  let entityManager: EntityManager;
  let lastTimestamp: number = 0;
  let startTime: number = 0;
  let selectedTransaction: DBTransactionXRP0;

  before(async () => {
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

  it(`Should verify attestation`, async function () {
    console.log(selectedTransaction)
    let request = await testPaymentRequest(entityManager, selectedTransaction, DB_BLOCK_TABLE, NUMBER_OF_CONFIRMATIONS, CHAIN_TYPE);
    console.log(request)
    let attestationRequest = {
      request: encodePayment(request),
      options: {
        roundId: 1,
        recheck: false,
        windowStartTime: startTime + 1, // must exist one block with timestamp lower
        UBPCutoffTime: startTime
      }
    } as AttestationRequest
    const resp = await axios.post(
      `http://localhost:${configurationService.wsServerConfiguration.port}/query`,
      attestationRequest
    );
    // console.log(resp.data)
    assert(resp.data.status === "OK", "Wrong server response");
    console.log(resp.data)
    // assert(resp.data.data.response.transactionHash === prefix0x(selectedTransaction.transactionId), "Wrong transaction id");
    
  });

  after(async () => {
    await app.close();
  });

});

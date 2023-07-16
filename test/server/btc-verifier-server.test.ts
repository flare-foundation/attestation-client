// This should always be on the top of the file, before imports
import { BtcTransaction, ChainType, prefix0x, toBN, toHex, toHex32Bytes } from "@flarenetwork/mcc";
import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from "@nestjs/testing";
import axios from "axios";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { EntityManager } from "typeorm";
import Web3 from "web3";
import { toNumber } from "web3-utils";
import { DBBlockBTC } from "../../src/entity/indexer/dbBlock";
import { DBTransactionBTC0 } from "../../src/entity/indexer/dbTransaction";
import { VerifierConfigurationService } from "../../src/servers/verifier-server/src/services/verifier-configuration.service";
import { VerifierProcessor } from "../../src/servers/verifier-server/src/services/verifier-processors/verifier-processor";
import { VerifierServerModule } from "../../src/servers/verifier-server/src/verifier-server.module";
import { getUnixEpochTimestamp } from "../../src/utils/helpers/utils";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { AttestationRequest, MIC_SALT } from "../../src/verification/attestation-types/attestation-types";
import { toHex as toHexPad } from "../../src/verification/attestation-types/attestation-types-helpers";

import { AttestationDefinitionStore } from "../../src/verification/attestation-types/AttestationDefinitionStore";
import { getSourceName } from "../../src/verification/sources/sources";
import {
  addressOnVout,
  firstAddressVin,
  firstAddressVout,
  generateTestIndexerDB,
  selectBlock,
  selectedReferencedTx,
  testBalanceDecreasingTransactionRequest,
  testConfirmedBlockHeightExistsRequest,
  testPaymentRequest,
  testReferencedPaymentNonexistenceRequest,
  totalDeliveredAmountToAddress,
} from "../indexed-query-manager/utils/indexerTestDataGenerator";
import { getTestFile } from "../test-utils/test-utils";
import { sendToVerifier } from "./utils/server-test-utils";

chai.use(chaiAsPromised);

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
  let selectedTransaction: DBTransactionBTC0;
  let defStore = new AttestationDefinitionStore();

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

  describe("indexer", function () {
    it("Should get indexer state", async function () {
      const resp = await axios.get(`http://localhost:${configurationService.config.port}/api/indexer/state`, {
        headers: {
          "x-api-key": API_KEY,
        },
      });

      expect(resp.data.data.length).to.eq(4);
    });

    it("Should get indexer block range", async function () {
      const resp = await axios.get(`http://localhost:${configurationService.config.port}/api/indexer/block-range`, {
        headers: {
          "x-api-key": API_KEY,
        },
      });

      expect(resp.data.data.last).to.eq(200);
    });

    it("Should get block-height", async function () {
      const resp = await axios.get(`http://localhost:${configurationService.config.port}/api/indexer/block-height`, {
        headers: {
          "x-api-key": API_KEY,
        },
      });

      expect(resp.data.data).to.eq(203);
    });

    it("Should get transaction for txId", async function () {
      const tx = await selectedReferencedTx(entityManager, DB_TX_TABLE, BLOCK_CHOICE + 10);
      const txId = tx.transactionId;
      const resp = await axios.get(`http://localhost:${configurationService.config.port}/api/indexer/transaction/${txId}`, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.data.blockNumber).to.eq(160);
    });

    it("Should get transaction for txId", async function () {
      const tx = await selectedReferencedTx(entityManager, DB_TX_TABLE, BLOCK_CHOICE + 10);
      const txId = tx.transactionId;
      const resp = await axios.get(`http://localhost:${configurationService.config.port}/api/indexer/transaction-block/${txId}`, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.data.blockNumber).to.eq(160);
    });

    it("Should not get transaction for invalid txId", async function () {
      const tx = await selectedReferencedTx(entityManager, DB_TX_TABLE, BLOCK_CHOICE + 10);
      const txId = "q4fd";
      const resp = await axios.get(`http://localhost:${configurationService.config.port}/api/indexer/transaction/${txId}`, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.data).to.be.null;
    });

    it("Should get block for blockHash", async function () {
      const hash = "4082d8aa0be13ab143f55d600665a8ae7ef90ba09d57c38fa538a2604d7e9827";
      const resp = await axios.get(`http://localhost:${configurationService.config.port}/api/indexer/block/${hash}`, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.data.blockNumber).to.eq(190);
      expect(resp.data.data.confirmed).to.be.true;
    });

    it("Should get confirmed-block-at height", async function () {
      const resp = await axios.get(`http://localhost:${configurationService.config.port}/api/indexer/confirmed-block-at/190`, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.data.blockNumber).to.eq(190);
      expect(resp.data.data.confirmed).to.be.true;
    });
  });

  describe("verifier", function () {
    it(`Should get MIC`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      request.blockNumber = toNumber(request.blockNumber);

      const resp = await axios.post(`http://localhost:${configurationService.config.port}/query/integrity`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.data, "MIC does not match").to.eq(request.messageIntegrityCode);
    });

    it(`Should not get MIC with wrong types request`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      await expect(
        axios.post(`http://localhost:${configurationService.config.port}/query/integrity`, request, {
          headers: {
            "x-api-key": API_KEY,
          },
        })
      ).to.be.rejected;
    });

    it(`Should prepare attestation response without mic`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      request.blockNumber = toNumber(request.blockNumber);

      const resp = await axios.post(`http://localhost:${configurationService.config.port}/query/prepare`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.status, "response not ok").to.eq("OK");
      expect(resp.data.data.status, "attestation response not ok").to.eq("OK");
    });

    it(`Should not MIC for invalid request`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      request.blockNumber = 300;

      const resp = await axios.post(`http://localhost:${configurationService.config.port}/query/integrity`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.status, "response not ok").to.eq("ERROR");
      expect(resp.data.data).to.be.undefined;
      expect(resp.data.errorMessage).to.eq("Invalid attestation request: DATA_AVAILABILITY_ISSUE");
    });

    it(`Should prepareAttestation`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      request.blockNumber = toNumber(request.blockNumber);

      const resp = await axios.post(`http://localhost:${configurationService.config.port}/query/prepareAttestation`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });

      expect(resp.data.status, "response not ok").to.eq("OK");
      expect(resp.data.data.length).to.eq(154);
    });

    it(`Should not prepareAttestation for invalid request`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      request.blockNumber = 300;

      const resp = await axios.post(`http://localhost:${configurationService.config.port}/query/prepareAttestation`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.status, "response not ok").to.eq("ERROR");
      expect(resp.data.data).to.be.undefined;
      expect(resp.data.errorMessage).to.eq("Invalid attestation request: DATA_AVAILABILITY_ISSUE");
    });

    it(`Should verify Payment attestation`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      let attestationRequest = {
        request: defStore.encodeRequest(request),
        options: {},
      } as AttestationRequest;

      let resp = await sendToVerifier(configurationService, attestationRequest, API_KEY);

      assert(resp.status === "OK", "Wrong server response");
      assert(resp.data.response.transactionHash === prefix0x(selectedTransaction.transactionId), "Wrong transaction id");
      let response = JSON.parse(selectedTransaction.getResponse());
      let sourceAddress = response.additionalData.vinouts[inUtxo].vinvout.scriptPubKey.address;
      let receivingAddress = response.data.vout[utxo].scriptPubKey.address;
      assert(resp.data.response.sourceAddressHash === Web3.utils.soliditySha3(sourceAddress), "Wrong source address");
      assert(resp.data.response.receivingAddressHash === Web3.utils.soliditySha3(receivingAddress), "Wrong receiving address");
      assert(request.messageIntegrityCode === defStore.dataHash(request, resp.data.response, MIC_SALT), "MIC does not match");
    });

    it(`Should verify Balance Decreasing attestation attestation`, async function () {
      let sourceAddressIndicator = toHex32Bytes(firstAddressVin(selectedTransaction));
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
      let response = JSON.parse(selectedTransaction.getResponse());
      let sourceAddress = response.additionalData.vinouts[parseInt(sourceAddressIndicator, 16)].vinvout.scriptPubKey.address;
      assert(resp.data.response.sourceAddressHash === Web3.utils.soliditySha3(sourceAddress), "Wrong source address");
      assert(request.messageIntegrityCode === defStore.dataHash(request, resp.data.response, MIC_SALT), "MIC does not match");
    });

    it(`Should not verify corrupt Balance Decreasing attestation attestation`, async function () {
      let sourceAddressIndicator = toHex32Bytes(firstAddressVin(selectedTransaction));      
      let request = await testBalanceDecreasingTransactionRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, sourceAddressIndicator);
      request.id = toHexPad(12, 32);
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
      confirmedBlock.blockNumber = 250;
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

    it(`Should verify Referenced Payment Nonexistence attestation`, async function () {
      let utxo = firstAddressVout(selectedTransaction, 1);
      let receivingAddress = addressOnVout(selectedTransaction, utxo);
      let receivedAmount = totalDeliveredAmountToAddress(selectedTransaction, receivingAddress);

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
        receivingAddress,
        prefix0x(selectedTransaction.paymentReference),
        receivedAmount.add(toBN(1))
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

    it(`Should fail to provide Referenced Payment Nonexistence with negative value`, async function () {
      let utxo = firstAddressVout(selectedTransaction, 0);
      let receivingAddress = addressOnVout(selectedTransaction, utxo);
      let receivedAmount = totalDeliveredAmountToAddress(selectedTransaction, receivingAddress);

      let firstOverflowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE + 3);
      let lowerQueryWindowBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, FIRST_BLOCK);

      let request = await testReferencedPaymentNonexistenceRequest(
        defStore, 
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

      expect(() => defStore.encodeRequest(request)).to.throw("Negative values are not supported in attestation requests");
    });

    it(`Should return correct supported source and types`, async function () {
      let processor = app.get("VERIFIER_PROCESSOR") as VerifierProcessor;
      assert(processor.supportedSource() === getSourceName(CHAIN_TYPE).toUpperCase(), `Supported source should be ${getSourceName(CHAIN_TYPE).toUpperCase()}`);
      let supported = processor.supportedAttestationTypes();
      assert(supported.indexOf("Payment") >= 0, "Payment should be supported");
      assert(supported.indexOf("BalanceDecreasingTransaction") >= 0, "BalanceDecreasingTransaction should be supported");
    });
  });
});

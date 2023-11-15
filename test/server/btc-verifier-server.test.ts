// This should always be on the top of the file, before imports
import { BtcTransaction, ChainType, MCC, prefix0x, toBN, toHex32Bytes } from "@flarenetwork/mcc";
import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from "@nestjs/testing";
import axios from "axios";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { EntityManager } from "typeorm";
import Web3 from "web3";
import { DBBlockBTC } from "../../src/entity/indexer/dbBlock";
import { DBTransactionBTC0 } from "../../src/entity/indexer/dbTransaction";
import { VerifierConfigurationService } from "../../src/servers/verifier-server/src/services/verifier-configuration.service";
import { getUnixEpochTimestamp } from "../../src/utils/helpers/utils";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { toHex as toHexPad } from "../../src/verification/attestation-types/attestation-types-helpers";

import { ethers } from "ethers";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";
import { EncodedRequest } from "../../src/servers/verifier-server/src/dtos/generic/generic.dto";
import { VerifierBtcServerModule } from "../../src/servers/verifier-server/src/verifier-btc-server.module";
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
import { MIC_SALT } from "../../src/external-libs/utils";

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

describe(`Test ${MCC.getChainTypeName(CHAIN_TYPE)} verifier server (${getTestFile(__filename)})`, () => {
  let app: INestApplication;
  let configurationService: VerifierConfigurationService;
  let entityManager: EntityManager;
  let lastTimestamp: number = 0;
  let startTime: number = 0;
  let selectedTransaction: DBTransactionBTC0;
  let defStore = new AttestationDefinitionStore("configs/type-definitions");

  before(async () => {
    process.env.SECURE_CONFIG_PATH = "./test/server/test-data";
    process.env.NODE_ENV = "development";
    process.env.VERIFIER_TYPE = MCC.getChainTypeName(CHAIN_TYPE).toLowerCase();
    process.env.TEST_IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST = "1";
    process.env.TEST_CREDENTIALS = "1";

    initializeTestGlobalLogger();

    const module = await Test.createTestingModule({
      imports: [VerifierBtcServerModule],
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

      const resp = await axios.post(`http://localhost:${configurationService.config.port}/Payment/mic`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.messageIntegrityCode, "MIC does not match").to.eq(request.messageIntegrityCode);
    });

    it(`Should get MIC without predefined mic`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      // request.blockNumber = toNumber(request.blockNumber);
      const mic = request.messageIntegrityCode;
      request.messageIntegrityCode = undefined;

      const resp = await axios.post(`http://localhost:${configurationService.config.port}/Payment/mic`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.messageIntegrityCode, "MIC does not match").to.eq(mic);
    });

    it(`Should not get MIC with wrong types request`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      request.requestBody.transactionId = ethers.keccak256(request.requestBody.transactionId);
      let resp = await axios.post(`http://localhost:${configurationService.config.port}/Payment/mic`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.response).to.be.undefined;
    });

    it(`Should prepare attestation response without mic`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      const resp = await axios.post(`http://localhost:${configurationService.config.port}/Payment/prepareResponse`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.status, "response not ok").to.eq("VALID");
      expect(resp.data.response).not.to.be.undefined;
    });

    it(`Should not return MIC for invalid request`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      request.requestBody.transactionId = ethers.keccak256(request.requestBody.transactionId);

      const resp = await axios.post(`http://localhost:${configurationService.config.port}/Payment/mic`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.messageIntegrityCode, "response not ok").to.be.undefined;
    });

    it(`Should prepareAttestation`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      const resp = await axios.post(`http://localhost:${configurationService.config.port}/Payment/prepareRequest`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });

      expect(resp.data.abiEncodedRequest, "response not ok").not.to.be.undefined;
      expect(resp.data.abiEncodedRequest.length, "wrong attestation request length").to.eq(386);
    });

    it(`Should prepareAttestation with invalid mic`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      // request.blockNumber = toNumber(request.blockNumber);
      request.messageIntegrityCode = "12";

      const resp = await axios.post(`http://localhost:${configurationService.config.port}/Payment/prepareRequest`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.abiEncodedRequest, "response not ok").not.to.be.undefined;
      expect(resp.data.abiEncodedRequest.length, "wrong attestation request length").to.eq(386);
    });

    it(`Should not prepareAttestation for invalid request`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      request.requestBody.transactionId = ethers.keccak256(request.requestBody.transactionId);

      const resp = await axios.post(`http://localhost:${configurationService.config.port}/Payment/prepareRequest`, request, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      expect(resp.data.abiEncodedRequest, "response not ok").to.be.undefined;
    });

    it(`Should verify Payment attestation`, async function () {
      let inUtxo = firstAddressVin(selectedTransaction);
      let utxo = firstAddressVout(selectedTransaction);
      let request = await testPaymentRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, inUtxo, utxo);

      let attestationRequest = {
        abiEncodedRequest: defStore.encodeRequest(request),
      } as EncodedRequest;

      let resp = await sendToVerifier("Payment", "BTC", configurationService, attestationRequest, API_KEY);

      assert(resp.status === "VALID", "Wrong server response");
      assert(resp.response.requestBody.transactionId === prefix0x(selectedTransaction.transactionId), "Wrong transaction id");
      let response = JSON.parse(selectedTransaction.getResponse());
      let sourceAddress = response.vin[inUtxo].prevout.scriptPubKey.address;
      let receivingAddress = response.vout[utxo].scriptPubKey.address;
      assert(resp.response.responseBody.sourceAddressHash === Web3.utils.soliditySha3(sourceAddress), "Wrong source address");
      assert(resp.response.responseBody.receivingAddressHash === Web3.utils.soliditySha3(receivingAddress), "Wrong receiving address");
      assert(request.messageIntegrityCode === defStore.attestationResponseHash(resp.response, MIC_SALT), "MIC does not match");
      // // assert(request.messageIntegrityCode === defStore.dataHash(request, resp.data.response, MIC_SALT), "MIC does not match");
    });

    it(`Should verify Balance Decreasing attestation attestation`, async function () {
      let sourceAddressIndicator = toHex32Bytes(firstAddressVin(selectedTransaction));
      let request = await testBalanceDecreasingTransactionRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, sourceAddressIndicator);
      let attestationRequest = {
        abiEncodedRequest: defStore.encodeRequest(request),
      } as EncodedRequest;

      let resp = await sendToVerifier("BalanceDecreasingTransaction", "BTC", configurationService, attestationRequest, API_KEY);

      assert(resp.status === "VALID", "Wrong server response");
      assert(resp.response.requestBody.transactionId === prefix0x(selectedTransaction.transactionId), "Wrong transaction id");
      let response = JSON.parse(selectedTransaction.getResponse());
      let sourceAddress = response.vin[parseInt(sourceAddressIndicator, 16)].prevout.scriptPubKey.address;
      assert(resp.response.responseBody.sourceAddressHash === Web3.utils.soliditySha3(sourceAddress), "Wrong source address");
      assert(request.messageIntegrityCode === defStore.attestationResponseHash(resp.response, MIC_SALT), "MIC does not match");
    });

    it(`Should not verify corrupt Balance Decreasing attestation attestation`, async function () {
      let sourceAddressIndicator = toHex32Bytes(firstAddressVin(selectedTransaction));
      let request = await testBalanceDecreasingTransactionRequest(defStore, selectedTransaction, TX_CLASS, CHAIN_TYPE, sourceAddressIndicator);
      request.requestBody.transactionId = toHexPad(12, 32);
      let attestationRequest = {
        abiEncodedRequest: defStore.encodeRequest(request),
      } as EncodedRequest;

      let resp = await sendToVerifier("BalanceDecreasingTransaction", "BTC", configurationService, attestationRequest, API_KEY);

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
      } as EncodedRequest;

      let resp = await sendToVerifier("ConfirmedBlockHeightExists", "BTC", configurationService, attestationRequest, API_KEY);
      assert(resp.status === "VALID", "Wrong server response");
      assert(BigInt(resp.response.requestBody.blockNumber) === BigInt(BLOCK_CHOICE), "Wrong block number");
      assert(
        BigInt(resp.response.responseBody.lowestQueryWindowBlockNumber) === BigInt(BLOCK_CHOICE - BLOCK_QUERY_WINDOW - 1),
        "Wrong lowest query window block number"
      );
      assert(request.messageIntegrityCode === defStore.attestationResponseHash(resp.response, MIC_SALT), "MIC does not match");
    });

    it(`Should not verify corrupt Confirmed Block Height Exists attestation`, async function () {
      let confirmedBlock = await selectBlock(entityManager, DB_BLOCK_TABLE, BLOCK_CHOICE);
      confirmedBlock.blockNumber = 250;
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
      } as EncodedRequest;

      let resp = await sendToVerifier("ConfirmedBlockHeightExists", "BTC", configurationService, attestationRequest, API_KEY);
      assert(resp.status === "INDETERMINATE", "Wrong server response");
      expect(resp.response).to.be.undefined;
    });

    it(`Should verify Referenced Payment Nonexistence attestation`, async function () {
      let utxo = firstAddressVout(selectedTransaction, 0);

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
        receivedAmount.add(toBN(1)).toString()
      );

      let attestationRequest = {
        abiEncodedRequest: defStore.encodeRequest(request),
      } as EncodedRequest;

      let resp = await sendToVerifier("ReferencedPaymentNonexistence", "BTC", configurationService, attestationRequest, API_KEY);

      assert(resp.status === "VALID", "Wrong server response");
      assert(BigInt(resp.response.responseBody.firstOverflowBlockNumber) === BigInt(BLOCK_CHOICE - 1), "Incorrect first overflow block");
      assert(
        BigInt(resp.response.responseBody.firstOverflowBlockTimestamp) === BigInt(selectedTransaction.timestamp - 1),
        "Incorrect first overflow block timestamp"
      );
      assert(request.messageIntegrityCode === defStore.attestationResponseHash(resp.response, MIC_SALT), "MIC does not match");
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
        receivedAmount.neg().toString()
      );

      expect(() => defStore.encodeRequest(request)).to.throw();
    });

    // it(`Should return correct supported source and types`, async function () {
    //   let processor = app.get("VERIFIER_PROCESSOR") as VerifierProcessor;
    //   assert(processor.supportedSource() === MCC.getChainTypeName(CHAIN_TYPE).toUpperCase(), `Supported source should be ${MCC.getChainTypeName(CHAIN_TYPE).toUpperCase()}`);
    //   let supported = processor.supportedAttestationTypes();
    //   assert(supported.indexOf("Payment") >= 0, "Payment should be supported");
    //   assert(supported.indexOf("BalanceDecreasingTransaction") >= 0, "BalanceDecreasingTransaction should be supported");
    // });
  });
});

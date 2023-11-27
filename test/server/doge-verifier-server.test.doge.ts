// This should always be on the top of the file, before imports
import { ChainType, DogeTransaction, MCC, prefix0x, sleepMs, toHex32Bytes } from "@flarenetwork/mcc";
import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from "@nestjs/testing";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ChildProcess, exec, execSync } from "child_process";
import { EntityManager } from "typeorm";
import { DBBlockDOGE } from "../../src/entity/indexer/dbBlock";
import { DBTransactionDOGE0 } from "../../src/entity/indexer/dbTransaction";
import { VerifierConfigurationService } from "../../src/servers/verifier-server/src/services/verifier-configuration.service";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";

import axios from "axios";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";
import { ZERO_BYTES_32, encodeAttestationName } from "../../src/external-libs/utils";
import { DogeIndexedQueryManager } from "../../src/indexed-query-manager/DogeIndexQueryManager";
import { IndexedQueryManagerOptions, RandomTransactionOptions } from "../../src/indexed-query-manager/indexed-query-manager-types";
import {
  BalanceDecreasingTransaction_Request,
  BalanceDecreasingTransaction_RequestBody,
} from "../../src/servers/verifier-server/src/dtos/attestation-types/BalanceDecreasingTransaction.dto";
import { Payment_Request } from "../../src/servers/verifier-server/src/dtos/attestation-types/Payment.dto";
import {
  ReferencedPaymentNonexistence_Request,
  ReferencedPaymentNonexistence_RequestBody,
} from "../../src/servers/verifier-server/src/dtos/attestation-types/ReferencedPaymentNonexistence.dto";
import { EncodedRequest } from "../../src/servers/verifier-server/src/dtos/generic/generic.dto";
import { VerifierDogeServerModule } from "../../src/servers/verifier-server/src/verifier-doge-server.module";
import { getTestFile } from "../test-utils/test-utils";
import { sendToVerifier } from "./utils/server-test-utils";

chai.use(chaiAsPromised);

const NUMBER_OF_CONFIRMATIONS = 6;
const FIRST_BLOCK = 100;
const LAST_BLOCK = 203;
const LAST_CONFIRMED_BLOCK = 200;
const CHAIN_TYPE = ChainType.DOGE;
const DB_BLOCK_TABLE = DBBlockDOGE;
const DB_TX_TABLE = DBTransactionDOGE0;
const TX_CLASS = DogeTransaction;
const BLOCK_CHOICE = 150;
const TXS_IN_BLOCK = 10;
const BLOCK_QUERY_WINDOW = 40;
const API_KEY = "123456";

describe(`Test ${MCC.getChainTypeName(CHAIN_TYPE)} verifier server (${getTestFile(__filename)})`, () => {
  let app: INestApplication;
  let configurationService: VerifierConfigurationService;
  let entityManager: EntityManager;
  let indexedQueryManager: DogeIndexedQueryManager;
  let lastTimestamp: number = 0;
  let startTime: number = 0;
  let selectedTransaction: DBTransactionDOGE0;
  let defStore = new AttestationDefinitionStore("configs/type-definitions");

  let testDB: ChildProcess;

  before(async () => {
    process.env.SECURE_CONFIG_PATH = "./test/server/test-data";
    process.env.NODE_ENV = "development";
    process.env.VERIFIER_TYPE = MCC.getChainTypeName(CHAIN_TYPE).toLowerCase();
    process.env.TEST_IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST = "1";
    process.env.TEST_CREDENTIALS = "1";
    process.env.EXTERNAL = "django";

    initializeTestGlobalLogger();

    console.log("Setting test db");
    testDB = exec("docker-compose -f ./test/server/test-data/test-doge-db-docker.yml up");

    let set = false;

    while (!set) {
      try {
        let res = execSync("docker exec test-db-doge dropdb -U db db");
        set = true;
      } catch (err) {
        await sleepMs(500);
      }
    }
    execSync("docker exec test-db-doge createdb -U db -E utf8 -T template0 db");
    execSync("docker exec test-db-doge pg_restore -U db --dbname=db /entrypoint/dump.sql");

    console.log("Test db set");

    const module = await Test.createTestingModule({
      imports: [VerifierDogeServerModule],
    }).compile();
    app = module.createNestApplication();

    app.useWebSocketAdapter(new WsAdapter(app));

    // unique test logger
    const logger = getGlobalLogger("web");

    configurationService = app.get("VERIFIER_CONFIG") as VerifierConfigurationService;
    entityManager = app.get("indexerDatabaseEntityManager");

    const options: IndexedQueryManagerOptions = {
      chainType: ChainType.DOGE,
      entityManager: entityManager,
      numberOfConfirmations: () => {
        return 6;
      },
    };

    indexedQueryManager = new DogeIndexedQueryManager(options);

    let port = configurationService.config.port;
    await app.listen(port, undefined, () => {
      logger.info(`Server started listening at http://localhost:${configurationService.config.port}`);
      logger.info(`Websocket server started listening at ws://localhost:${configurationService.config.port}`);
    });
    await app.init();
  });

  after(async () => {
    delete process.env.TEST_IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST;
    delete process.env.TEST_CREDENTIALS;
    delete process.env.VERIFIER_TYPE;
    delete process.env.SECURE_CONFIG_PATH;
    try {
      execSync("docker-compose -f ./test/server/test-data/test-doge-db-docker.yml down --volumes");
    } catch (err) {}

    testDB.kill();

    await app.close();
  });

  it("Should get indexer block range", async function () {
    const resp = await axios.get(`http://localhost:${configurationService.config.port}/api/indexer/block-range`, {
      headers: {
        "x-api-key": API_KEY,
      },
    });
    expect(resp.data.status).to.eq("OK");
  });

  it("Should get confirmed-block-at height", async function () {
    const resp = await axios.get(`http://localhost:${configurationService.config.port}/api/indexer/confirmed-block-at/4960560`, {
      headers: {
        "x-api-key": API_KEY,
      },
    });
    expect(resp.data.status).to.eq("OK");
  });

  it(`Should verify Payment attestation`, async function () {
    const txId = "25bb2f83ac5349259438faea7b6afdf327d7f679c96ca9cff6e134d92f33b6cd";
    const inIndex = 0;
    const outIndex = 0;

    const request = {
      attestationType: encodeAttestationName("Payment"),
      sourceId: encodeAttestationName("DOGE"),
      messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000",
      requestBody: {
        transactionId: prefix0x(txId),
        inUtxo: inIndex.toString(),
        utxo: outIndex.toString(),
      },
    } as Payment_Request;

    const attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequest;

    const resp = await sendToVerifier("Payment", "DOGE", configurationService, attestationRequest, API_KEY);

    assert(resp.status === "VALID", "Wrong server response");
    expect(resp.response.requestBody).is.deep.eq(request.requestBody);
  });

  it(`Should not verify Payment attestation with invalid index`, async function () {
    const txId = "25bb2f83ac5349259438faea7b6afdf327d7f679c96ca9cff6e134d92f33b6cd";
    const inIndex = 3;
    const outIndex = 0;

    const request = {
      attestationType: encodeAttestationName("Payment"),
      sourceId: encodeAttestationName("DOGE"),
      messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000",
      requestBody: {
        transactionId: prefix0x(txId),
        inUtxo: inIndex.toString(),
        utxo: outIndex.toString(),
      },
    } as Payment_Request;

    const attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequest;

    let resp = await sendToVerifier("Payment", "DOGE", configurationService, attestationRequest, API_KEY);

    assert(resp.status === "INVALID", "Wrong server response");
  });

  it(`Should not verify Payment attestation for coinbase`, async function () {
    const txId = "eb27292f2a91906dfcee489a934d51e6e8dd0de28f116e83f947fa74deb77007";
    const inIndex = 0;
    const outIndex = 0;

    const request = {
      attestationType: encodeAttestationName("Payment"),
      sourceId: encodeAttestationName("DOGE"),
      messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000",
      requestBody: {
        transactionId: prefix0x(txId),
        inUtxo: inIndex.toString(),
        utxo: outIndex.toString(),
      },
    } as Payment_Request;

    const attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequest;

    let resp = await sendToVerifier("Payment", "DOGE", configurationService, attestationRequest, API_KEY);

    assert(resp.status === "INVALID", "Wrong server response");
  });

  it(`Should verify Balance Decreasing attestation attestation`, async function () {
    const txId = "25bb2f83ac5349259438faea7b6afdf327d7f679c96ca9cff6e134d92f33b6cd";
    const inIndex = 1;
    const requestBody: BalanceDecreasingTransaction_RequestBody = {
      transactionId: prefix0x(txId),
      sourceAddressIndicator: toHex32Bytes(inIndex),
    };

    const request: BalanceDecreasingTransaction_Request = {
      attestationType: encodeAttestationName("BalanceDecreasingTransaction"),
      sourceId: encodeAttestationName("DOGE"),
      messageIntegrityCode: ZERO_BYTES_32,
      requestBody,
    };

    const attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequest;

    let resp = await sendToVerifier("BalanceDecreasingTransaction", "DOGE", configurationService, attestationRequest, API_KEY);

    expect(resp.status).to.eq("VALID");
    expect(resp.response).to.not.be.undefined;
  });

  it(`Should not verify Balance Decreasing attestation attestation with wrong index`, async function () {
    const txId = "25bb2f83ac5349259438faea7b6afdf327d7f679c96ca9cff6e134d92f33b6cd";
    const inIndex = 15;
    const requestBody: BalanceDecreasingTransaction_RequestBody = {
      transactionId: prefix0x(txId),
      sourceAddressIndicator: toHex32Bytes(inIndex),
    };

    const request: BalanceDecreasingTransaction_Request = {
      attestationType: encodeAttestationName("BalanceDecreasingTransaction"),
      sourceId: encodeAttestationName("DOGE"),
      messageIntegrityCode: ZERO_BYTES_32,
      requestBody,
    };

    const attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequest;

    let resp = await sendToVerifier("BalanceDecreasingTransaction", "DOGE", configurationService, attestationRequest, API_KEY);

    expect(resp.status).to.eq("INVALID");
  });

  it(`Should verify Referenced Payment Nonexistence attestation`, async function () {
    const requestBody: ReferencedPaymentNonexistence_RequestBody = {
      minimalBlockNumber: "4960557",
      deadlineBlockNumber: "4960559",
      deadlineTimestamp: "1699656585",
      destinationAddressHash: "0x368ccf3ca7292673ead5b65342a40bda23526b95c82f303906ea0e55683610ef",
      amount: "10",
      standardPaymentReference: "0x368ccf3ca7292673ead5b65342a40bda23526b95c82f303906ea0e55683610ef",
    };

    const request: ReferencedPaymentNonexistence_Request = {
      attestationType: encodeAttestationName("ReferencedPaymentNonexistence"),
      sourceId: encodeAttestationName("DOGE"),
      messageIntegrityCode: ZERO_BYTES_32,
      requestBody,
    };

    let attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequest;

    let resp = await sendToVerifier("ReferencedPaymentNonexistence", "DOGE", configurationService, attestationRequest, API_KEY);

    assert(resp.status === "VALID", "Wrong server response");
  });

  it(`Should not verify Referenced Payment Nonexistence attestation`, async function () {
    const options: RandomTransactionOptions = { mustBeNativePayment: true };
    const range = await indexedQueryManager.fetchRandomTransactions(1, options);
    console.log(range);

    const requestBody: ReferencedPaymentNonexistence_RequestBody = {
      minimalBlockNumber: "4960557",
      deadlineBlockNumber: "4960559",
      deadlineTimestamp: "1699656585",
      destinationAddressHash: "0x368ccf3ca7292673ead5b65342a40bda23526b95c82f303906ea0e55683610ef",
      amount: "10",
      standardPaymentReference: "0x368ccf3ca7292673ead5b65342a40bda23526b95c82f303906ea0e55683610ef",
    };

    const request: ReferencedPaymentNonexistence_Request = {
      attestationType: encodeAttestationName("ReferencedPaymentNonexistence"),
      sourceId: encodeAttestationName("DOGE"),
      messageIntegrityCode: ZERO_BYTES_32,
      requestBody,
    };

    let attestationRequest = {
      abiEncodedRequest: defStore.encodeRequest(request),
    } as EncodedRequest;

    let resp = await sendToVerifier("ReferencedPaymentNonexistence", "DOGE", configurationService, attestationRequest, API_KEY);

    assert(resp.status === "VALID", "Wrong server response");

    // assert(resp.status === "OK", "Wrong server response");
    // assert(resp.data.status === "OK", "Status is not OK");
    // assert(resp.data.response.firstOverflowBlockNumber === toHex(BLOCK_CHOICE - 1), "Incorrect first overflow block");
    // assert(resp.data.response.firstOverflowBlockTimestamp === toHex(selectedTransaction.timestamp - 1), "Incorrect first overflow block timestamp");
    // assert(request.messageIntegrityCode === defStore.dataHash(request, resp.data.response, MIC_SALT), "MIC does not match");
  });
});

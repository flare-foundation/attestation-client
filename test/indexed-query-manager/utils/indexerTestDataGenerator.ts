import { ChainType, MCC, prefix0x, toBN, unPrefix0x } from "@flarenetwork/mcc";
import fs from "fs";
import { EntityManager } from "typeorm";
import Web3 from "web3";
import { DBBlockBase } from "../../../src/entity/indexer/dbBlock";
import { DBState } from "../../../src/entity/indexer/dbState";
import { DBTransactionBase } from "../../../src/entity/indexer/dbTransaction";
import { AttestationDefinitionStore } from "../../../src/external-libs/AttestationDefinitionStore";
import { MIC_SALT, encodeAttestationName } from "../../../src/external-libs/utils";
import { BalanceDecreasingTransaction_Request } from "../../../src/servers/verifier-server/src/dtos/attestation-types/BalanceDecreasingTransaction.dto";
import { ConfirmedBlockHeightExists_Request } from "../../../src/servers/verifier-server/src/dtos/attestation-types/ConfirmedBlockHeightExists.dto";
import { Payment_Request } from "../../../src/servers/verifier-server/src/dtos/attestation-types/Payment.dto";
import { ReferencedPaymentNonexistence_Request } from "../../../src/servers/verifier-server/src/dtos/attestation-types/ReferencedPaymentNonexistence.dto";
import {
  responseBalanceDecreasingTransaction,
  responseConfirmedBlockHeightExists,
  responsePayment,
  responseReferencedPaymentNonExistence,
} from "../../../src/servers/verifier-server/src/verification/generic-chain-verifications";
import { MccTransactionType } from "../../../src/servers/verifier-server/src/verification/verification-utils";
import { compressBin } from "../../../src/utils/compression/compression";
import { getUnixEpochTimestamp } from "../../../src/utils/helpers/utils";
import { toHex } from "../../../src/verification/attestation-types/attestation-types-helpers";
import { TransactionResult } from "../../../src/indexed-query-manager/indexed-query-manager-types";

const TEST_DATA_PATH = "test/indexed-query-manager/test-data";

// Test files
const BTC_TYPES_COUNT = 4;
const BTC_PAYMENT = fs.readFileSync(`${TEST_DATA_PATH}/btc-payment.json`).toString();
const BTC_PAYMENT_MANY_INPUTS = fs.readFileSync(`${TEST_DATA_PATH}/btc-payment-many-inputs.json`).toString();
const BTC_PAYMENT_WITH_REFERENCE_1 = fs.readFileSync(`${TEST_DATA_PATH}/btc-payment-with-reference-1.json`).toString();
const BTC_PAYMENT_WITH_REFERENCE_2 = fs.readFileSync(`${TEST_DATA_PATH}/btc-payment-with-reference-2.json`).toString();

const XRP_TYPES_COUNT = 4;
const XRP_PAYMENT = fs.readFileSync(`${TEST_DATA_PATH}/xrp-payment.json`).toString();
const XRP_ACCOUNT_SET = fs.readFileSync(`${TEST_DATA_PATH}/xrp-account-set.json`).toString();
const XRP_OFFER_CREATE = fs.readFileSync(`${TEST_DATA_PATH}/xrp-offer-create.json`).toString();
const XRP_PAYMENT_REFERENCE = fs.readFileSync(`${TEST_DATA_PATH}/xrp-payment-reference.json`).toString();

const DOGE_TYPES_COUNT = 4;
const DOGE_PAYMENT = fs.readFileSync(`${TEST_DATA_PATH}/btc-payment.json`).toString();
const DOGE_PAYMENT_MANY_INPUTS = fs.readFileSync(`${TEST_DATA_PATH}/btc-payment-many-inputs.json`).toString();
const DOGE_PAYMENT_WITH_REFERENCE_1 = fs.readFileSync(`${TEST_DATA_PATH}/btc-payment-with-reference-1.json`).toString();
const DOGE_PAYMENT_WITH_REFERENCE_2 = fs.readFileSync(`${TEST_DATA_PATH}/btc-payment-with-reference-2.json`).toString();

export const ZERO_PAYMENT_REFERENCE = "0000000000000000000000000000000000000000000000000000000000000000";
const BTC_IN_SATOSHI = 100000000;

export function testBlockHash(blockNumber: number): string {
  return unPrefix0x(Web3.utils.soliditySha3(toHex(blockNumber, 32)));
}

export function testTransactionHash(transactionIndex: number, blockNumber: number) {
  let txHash = Web3.utils.soliditySha3(toHex(transactionIndex, 32));
  let blockHash = testBlockHash(blockNumber);
  return unPrefix0x(Web3.utils.soliditySha3(txHash + blockHash));
}

function setFirstOPReturn(vouts: any, value: string) {
  for (let vout of vouts) {
    if (vout.scriptPubKey?.asm?.startsWith("OP_RETURN")) {
      vout.scriptPubKey.asm = `OP_RETURN ${unPrefix0x(value)}`;
      return;
    }
  }
  throw new Error("No OP_RETURN found");
}

function addBtcTransactionResponse(transaction: TransactionResult, transactionIndex: number) {
  let index = parseInt(transaction.transactionId.slice(-1), 16) % BTC_TYPES_COUNT;
  let txStr = "";
  let paymentReference = null;
  switch (index) {
    case 0:
      txStr = BTC_PAYMENT;
      break;
    case 1:
      txStr = BTC_PAYMENT_MANY_INPUTS;
      break;
    case 2:
      txStr = BTC_PAYMENT_WITH_REFERENCE_1;
      paymentReference = unPrefix0x(toHex(parseInt(transaction.transactionId.slice(-10), 16), 32));
      break;
    case 3:
      txStr = BTC_PAYMENT_WITH_REFERENCE_2;
      paymentReference = unPrefix0x(toHex(parseInt(transaction.transactionId.slice(-10), 16), 32));
      break;
    default:
      throw new Error("Impossible option");
  }
  let json = JSON.parse(txStr);
  json.data.txid = unPrefix0x(transaction.transactionId);
  if (paymentReference) {
    setFirstOPReturn(json.data.vout, paymentReference);
    transaction.paymentReference = paymentReference;
  } else {
    transaction.paymentReference = unPrefix0x(toHex(0, 32));
  }
  return JSON.stringify(json);
}

function addXrpTransactionResponse(transaction: TransactionResult, transactionIndex: number) {
  let index = parseInt(transaction.transactionId.slice(-1), 16) % XRP_TYPES_COUNT;
  let txStr = "";
  let paymentReference = null;
  switch (index) {
    case 0:
      txStr = XRP_PAYMENT;
      break;
    case 1:
      txStr = XRP_ACCOUNT_SET;
      break;
    case 2:
      txStr = XRP_OFFER_CREATE;
      break;
    case 3:
      txStr = XRP_PAYMENT_REFERENCE;
      paymentReference = unPrefix0x(toHex(parseInt(transaction.transactionId.slice(-10), 16), 32));
      break;
    default:
      throw new Error("Impossible option");
  }
  let json = JSON.parse(txStr);
  json.data.result.hash = unPrefix0x(transaction.transactionId);
  json.data.result.meta.TransactionIndex = transactionIndex;
  if (paymentReference) {
    json.data.result.Memos[0].Memo.MemoData = paymentReference;
    transaction.paymentReference = paymentReference;
  } else {
    transaction.paymentReference = unPrefix0x(toHex(0, 32));
  }

  return JSON.stringify(json);
}

function addDogeTransactionResponse(transaction: TransactionResult, transactionIndex: number) {
  let index = parseInt(transaction.transactionId.slice(-1), 16) % DOGE_TYPES_COUNT;
  let txStr = "";
  let paymentReference = null;
  switch (index) {
    case 0:
      txStr = DOGE_PAYMENT;
      break;
    case 1:
      txStr = DOGE_PAYMENT_MANY_INPUTS;
      break;
    case 2:
      txStr = DOGE_PAYMENT_WITH_REFERENCE_1;
      break;
    case 3:
      txStr = DOGE_PAYMENT_WITH_REFERENCE_2;
      paymentReference = unPrefix0x(toHex(parseInt(transaction.transactionId.slice(-10), 16), 32));
      break;
    default:
      throw new Error("Impossible option");
  }
  let json = JSON.parse(txStr);
  json.data.txid = unPrefix0x(transaction.transactionId);
  if (paymentReference) {
    setFirstOPReturn(json.data.vout, paymentReference);
    transaction.paymentReference = paymentReference;
  } else {
    transaction.paymentReference = unPrefix0x(toHex(0, 32));
  }
  return JSON.stringify(json);
}

function addTransactionResponse(transaction: TransactionResult, transactionIndex: number) {
  switch (transaction.chainType) {
    case ChainType.BTC:
      return addBtcTransactionResponse(transaction, transactionIndex);
    case ChainType.XRP:
      return addXrpTransactionResponse(transaction, transactionIndex);
    case ChainType.DOGE:
      return addDogeTransactionResponse(transaction, transactionIndex);
    default:
      throw new Error(`Unsupported chain type: '${transaction.chainType}'`);
  }
}

function generateTransactionsForBlock(chainType: ChainType, blockNumber: number, blockTimestamp: number, transactionEntity: any, transactionsPerBlock: number) {
  let transactions: DBTransactionBase[] = [];
  for (let i = 0; i < transactionsPerBlock; i++) {
    let transaction = new transactionEntity() as DBTransactionBase;
    transaction.chainType = chainType;
    transaction.transactionId = testTransactionHash(i, blockNumber);
    transaction.blockNumber = blockNumber;
    transaction.timestamp = blockTimestamp;
    transaction.paymentReference = "";
    transaction.isNativePayment = true;
    transaction.transactionType = "";
    transaction.response = compressBin(addTransactionResponse(transaction, i));
    transactions.push(transaction);
  }
  return transactions;
}

export async function generateTestIndexerDB(
  chainType: ChainType,
  manager: EntityManager,
  blockEntity: any,
  transactionEntity: any,
  startBlock: number,
  endBlock: number,
  lastTimestamp: number,
  lastConfirmedBlock: number,
  transactionsPerBlock: number,
  lastSampleTimestamp?: number
) {
  for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
    let timestamp = lastTimestamp - (endBlock - startBlock) + (blockNumber - startBlock);
    let dbBlock = new blockEntity();
    dbBlock.blockHash = testBlockHash(blockNumber);
    dbBlock.blockNumber = blockNumber;
    dbBlock.timestamp = timestamp;
    dbBlock.transactions = transactionsPerBlock;
    dbBlock.confirmed = blockNumber <= lastConfirmedBlock;
    dbBlock.numberOfConfirmations = 0;
    dbBlock.previousBlockHash = testBlockHash(blockNumber - 1);

    if (dbBlock.confirmed) {
      let transactions = generateTransactionsForBlock(chainType, blockNumber, timestamp, transactionEntity, transactionsPerBlock);
      await manager.save(transactions);
    }
    await manager.save(dbBlock);
  }
  let stateEntries: DBState[] = [];
  let prefixName = MCC.getChainTypeName(chainType);
  let dbState = new DBState();
  dbState.name = `${prefixName}_N`;
  dbState.valueNumber = lastConfirmedBlock;
  dbState.timestamp = lastSampleTimestamp ? lastSampleTimestamp : getUnixEpochTimestamp();
  stateEntries.push(dbState);

  dbState = new DBState();
  // dbState.name = `${prefixName}_T`;
  dbState.name = getChainT(chainType);
  dbState.valueNumber = endBlock;
  dbState.timestamp = lastSampleTimestamp ? lastSampleTimestamp : getUnixEpochTimestamp();
  stateEntries.push(dbState);

  dbState = new DBState();
  dbState.name = `${prefixName}_Nbottom`;
  dbState.valueNumber = startBlock;
  dbState.timestamp = lastSampleTimestamp ? lastSampleTimestamp : getUnixEpochTimestamp();
  stateEntries.push(dbState);

  dbState = new DBState();
  dbState.name = `${prefixName}_NbottomTime`;
  dbState.valueNumber = lastTimestamp - (endBlock - startBlock);
  dbState.timestamp = lastSampleTimestamp ? lastSampleTimestamp : getUnixEpochTimestamp();
  stateEntries.push(dbState);

  await manager.save(stateEntries);
}

function getChainT(chainType: ChainType) {
  return `${MCC.getChainTypeName(chainType)}_T`;
}

export async function snapshotTimestampT(manager: EntityManager, chainType: ChainType) {
  const res = await manager.findOne(DBState, { where: { name: getChainT(chainType) } });
  if (!res) {
    throw new Error(`State '${getChainT(chainType)}' does not exist`);
  }
  return res.valueNumber;
}

export async function changeTimestampT(manager: EntityManager, chainType: ChainType, newTimestamp: number) {
  const res = await manager.findOne(DBState, { where: { name: getChainT(chainType) } });
  if (!res) {
    throw new Error(`State '${getChainT(chainType)}' does not exist`);
  }
  res.timestamp = newTimestamp;
  await manager.save(res);
}

export async function selectedReferencedTx(entityManager: EntityManager, dbTxClass: any, blockNumber: number, which = 0): Promise<DBTransactionBase> {
  let query2 = entityManager
    .createQueryBuilder(dbTxClass, "transaction")
    .where("transaction.blockNumber = :blockNumber", { blockNumber })
    .andWhere("transaction.paymentReference != :paymentReference", { paymentReference: ZERO_PAYMENT_REFERENCE })
    .orderBy("transaction.transactionId", "ASC");
  let result = await query2.getMany();
  if (result.length <= which) {
    throw new Error("Wrong 'which");
  }
  return result[which] as any as DBTransactionBase;
}

export async function selectBlock(entityManager: EntityManager, blockClass: any, blockNumber: number): Promise<DBBlockBase> {
  let query = entityManager.createQueryBuilder(blockClass, "block").where("block.blockNumber = :blockNumber", { blockNumber });
  return (await query.getOne()) as any as DBBlockBase;
}

export function firstAddressVout(dbTransaction: DBTransactionBase, index = 0) {
  let response = JSON.parse(dbTransaction.getResponse());
  let appearances = [];
  for (let i = 0; i < response.data.vout.length; i++) {
    let address = response.data.vout[i].scriptPubKey?.address;
    if (address) {
      if (appearances.indexOf(address) >= 0) {
        continue;
      }
      if (appearances.length === index) {
        return i;
      }
      appearances.push(address);
    }
  }
  throw new Error("No output address");
}

export function firstAddressVin(dbTransaction: DBTransactionBase) {
  let response = JSON.parse(dbTransaction.getResponse());
  for (let i = 0; i < response.data.vin.length; i++) {
    if (response.data.vin[i].prevout.scriptPubKey?.address) {
      return i;
    }
  }
  throw new Error("No input address");
}

export function addressOnVout(dbTransaction: DBTransactionBase, i: number) {
  let response = JSON.parse(dbTransaction.getResponse());
  return response.data?.vout?.[i]?.scriptPubKey?.address;
}

export function totalDeliveredAmountToAddress(dbTransaction: DBTransactionBase, address: string) {
  let spent = toBN(0);
  let response = JSON.parse(dbTransaction.getResponse());
  for (let i = 0; i < response.additionalData.vinouts.length; i++) {
    if (response.additionalData?.vinouts?.[i]?.vinvout?.scriptPubKey?.address === address) {
      let value = response.additionalData?.vinouts?.[i]?.vinvout.value;
      if (value) {
        spent = spent.add(toBN(Math.floor(value * BTC_IN_SATOSHI)));
      }
    }
  }
  let received = toBN(0);
  for (let i = 0; i < response.data.vout.length; i++) {
    if (response.data.vout[i].scriptPubKey?.address === address) {
      let value = response.data.vout[i].value;
      if (value) {
        received = received.add(toBN(Math.floor(value * BTC_IN_SATOSHI)));
      }
    }
  }
  return received.sub(spent);
}

export async function testPaymentRequest(
  definitionStore: AttestationDefinitionStore,
  dbTransaction: DBTransactionBase,
  TransactionClass: new (...args: any[]) => MccTransactionType,
  chainType: ChainType,
  inUtxo: number = 0,
  utxo: number = 0
) {
  const request = {
    attestationType: encodeAttestationName("Payment"),
    sourceId: encodeAttestationName(MCC.getChainTypeName(chainType)),
    messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000",
    requestBody: {
      transactionId: prefix0x(dbTransaction.transactionId),
      inUtxo: inUtxo.toString(),
      utxo: utxo.toString(),
    }
  } as Payment_Request;

  const responseData = await responsePayment(dbTransaction, TransactionClass, request, undefined);

  if (responseData.status === "OK") {
    request.messageIntegrityCode = definitionStore.attestationResponseHash(responseData.response, MIC_SALT);
  }
  return request;
}

export async function testBalanceDecreasingTransactionRequest(
  definitionStore: AttestationDefinitionStore,
  dbTransaction: DBTransactionBase,
  TransactionClass: new (...args: any[]) => MccTransactionType,
  chainType: ChainType,
  sourceAddressIndicator: string = "0x0000000000000000000000000000000000000000000000000000000000000000"
) {
  const request = {
    attestationType: encodeAttestationName("BalanceDecreasingTransaction"),
    sourceId: encodeAttestationName(MCC.getChainTypeName(chainType)),
    messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000",
    requestBody: {
      transactionId: prefix0x(dbTransaction.transactionId),
      sourceAddressIndicator,
    }
  } as BalanceDecreasingTransaction_Request;

  const responseData = await responseBalanceDecreasingTransaction(dbTransaction, TransactionClass, request, undefined);

  if (responseData.status === "OK") {
    request.messageIntegrityCode = definitionStore.attestationResponseHash(responseData.response, MIC_SALT);
  }
  return request;
}

export async function testConfirmedBlockHeightExistsRequest(
  definitionStore: AttestationDefinitionStore,
  dbBlock: DBBlockBase,
  lowerQueryWindowBlock: DBBlockBase,
  chainType: ChainType,
  numberOfConfirmations: number,
  queryWindow: number
) {
  const request = {
    attestationType: encodeAttestationName("ConfirmedBlockHeightExists"),
    sourceId: encodeAttestationName(MCC.getChainTypeName(chainType)),
    messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000",
    requestBody: {
      blockNumber: dbBlock.blockNumber.toString(),
      queryWindow: queryWindow.toString(),
    }
  } as ConfirmedBlockHeightExists_Request;

  const responseData = await responseConfirmedBlockHeightExists(dbBlock, lowerQueryWindowBlock, numberOfConfirmations, request);

  if (responseData.status === "OK") {
    request.messageIntegrityCode = definitionStore.attestationResponseHash(responseData.response, MIC_SALT);
  }
  return request;
}

export async function testReferencedPaymentNonexistenceRequest(
  definitionStore: AttestationDefinitionStore,
  dbTransactions: DBTransactionBase[],
  TransactionClass: new (...args: any[]) => MccTransactionType,
  firstOverflowBlock: DBBlockBase,
  lowerBoundaryBlock: DBBlockBase,
  chainType: ChainType,
  deadlineBlockNumber: number,
  deadlineTimestamp: number,
  destinationAddress: string,
  paymentReference: string,
  amount: string | number
) {

  const request = {
    attestationType: encodeAttestationName("ReferencedPaymentNonexistence"),
    sourceId: encodeAttestationName(MCC.getChainTypeName(chainType)),
    messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000",
    requestBody: {
      minimalBlockNumber: lowerBoundaryBlock.blockNumber.toString(),
      deadlineBlockNumber: deadlineBlockNumber.toString(),
      deadlineTimestamp: deadlineTimestamp.toString(),
      destinationAddressHash: Web3.utils.soliditySha3(destinationAddress),
      amount: amount.toString(),
      standardPaymentReference: paymentReference,
    }
  } as ReferencedPaymentNonexistence_Request;

  const responseData = await responseReferencedPaymentNonExistence(
    dbTransactions,
    TransactionClass,
    firstOverflowBlock,
    lowerBoundaryBlock,
    request
  );


  if (responseData.status === "OK") {
    request.messageIntegrityCode = definitionStore.attestationResponseHash(responseData.response, MIC_SALT);
  }

  return request;
}

// name, valueString, valueNumber,timestamp, comment
// 'XRP_N', '', '33239817', '1669640060', ''
// 'XRP_Nbottom', '', '33157114', '1670277952', ''
// 'XRP_NbottomTime', '', '1669379742', '1670277952', ''
// 'XRP_state', 'sync', '-1', '1669640060', ''
// 'XRP_T', '', '33239822', '1669640060', ''

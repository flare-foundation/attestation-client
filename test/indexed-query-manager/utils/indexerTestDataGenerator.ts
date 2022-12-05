import { ChainType, unPrefix0x } from "@flarenetwork/mcc";
import { EntityManager } from "typeorm";
import { DBTransactionBase } from "../../../lib/entity/indexer/dbTransaction";
import { toHex } from "../../../lib/verification/attestation-types/attestation-types-helpers";
import fs from "fs";
import Web3 from "web3";
import { DBState } from "../../../lib/entity/indexer/dbState";
import { getSourceName } from "../../../lib/verification/sources/sources";
import { getUnixEpochTimestamp } from "../../../lib/utils/utils";

const TEST_DATA_PATH = 'test/indexed-query-manager/test-data'

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

export function testBlockHash(blockNumber: number): string {
   return Web3.utils.soliditySha3(toHex(blockNumber, 32));
}

export function testTransactionHash(transactionIndex: number, blockNumber: number) {
   let txHash = Web3.utils.soliditySha3(toHex(transactionIndex, 32));
   let blockHash = unPrefix0x(testBlockHash(blockNumber));
   return Web3.utils.soliditySha3(txHash + blockHash);
}

function addBtcTransactionResponse(transaction: DBTransactionBase, transactionIndex: number) {
   let index = parseInt(transaction.transactionId.slice(-1), 16) % BTC_TYPES_COUNT;
   let txStr = "";
   switch (index) {
      case 0:
         txStr = BTC_PAYMENT;
         break;
      case 1:
         txStr = BTC_PAYMENT_MANY_INPUTS;
         break;
      case 2:
         txStr = BTC_PAYMENT_WITH_REFERENCE_1
         break;
      case 3:
         txStr = BTC_PAYMENT_WITH_REFERENCE_2
         break;
      default:
         throw new Error("Impossible option");
   }
   let json = JSON.parse(txStr);
   json.data.txid = unPrefix0x(transaction.transactionId);
   return JSON.stringify(json);
}

function addXrpTransactionResponse(transaction: DBTransactionBase, transactionIndex: number) {
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
         txStr = XRP_OFFER_CREATE
         break;
      case 3:
         txStr = XRP_PAYMENT_REFERENCE
         paymentReference = unPrefix0x(toHex(index, 32));
         break;
      default:
         throw new Error("Impossible option");
   }
   let json = JSON.parse(txStr);
   json.data.result.hash = unPrefix0x(transaction.transactionId);
   json.data.result.metaData.TransactionIndex = transactionIndex;
   if (paymentReference) {
      json.data.result.Memos[0].Memo.MemoData = paymentReference;
      transaction.paymentReference = paymentReference
   } else {
      transaction.paymentReference = unPrefix0x(toHex(0, 32));
   }

   return JSON.stringify(json);
}

function addTransactionResponse(transaction: DBTransactionBase, transactionIndex: number) {
   switch (transaction.chainType) {
      case ChainType.BTC:
         return addBtcTransactionResponse(transaction, transactionIndex);
      case ChainType.XRP:
         return addXrpTransactionResponse(transaction, transactionIndex);
      default:
         throw new Error(`Unsupported chain type: '${transaction.chainType}'`);
   }
}

function generateTransactionsForBlock(
   chainType: ChainType,
   blockNumber: number,
   blockTimestamp: number,
   transactionEntity: any,
   transactionsPerBlock: number
) {
   let transactions: DBTransactionBase[] = [];
   for (let i = 0; i < transactionsPerBlock; i++) {
      let transaction = new transactionEntity() as DBTransactionBase;
      transaction.chainType = chainType;
      transaction.transactionId = testTransactionHash(i, blockNumber);
      transaction.blockNumber = blockNumber;
      transaction.timestamp = blockTimestamp;
      transaction.paymentReference = "";
      transaction.response = "";
      transaction.isNativePayment = true;
      transaction.transactionType = "";
      transaction.response = addTransactionResponse(transaction, i);
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
      let transactions = generateTransactionsForBlock(chainType, blockNumber, timestamp, transactionEntity, transactionsPerBlock);
      let dbBlock = new blockEntity();
      dbBlock.blockHash = testBlockHash(blockNumber);
      dbBlock.blockNumber = blockNumber;
      dbBlock.timestamp = timestamp;
      dbBlock.transactions = transactions.length;
      dbBlock.confirmed = blockNumber <= lastConfirmedBlock;
      dbBlock.numberOfConfirmations = 0;
      dbBlock.previousBlockHash = testBlockHash(blockNumber - 1);
      await manager.save(dbBlock);
      await manager.save(transactions);
   }
   let stateEntries: DBState[] = [];
   let prefixName = getSourceName(chainType).toUpperCase();
   let dbState = new DBState();
   dbState.name = `${prefixName}_N`;
   dbState.valueNumber = lastConfirmedBlock;
   dbState.timestamp = lastSampleTimestamp ? lastSampleTimestamp : getUnixEpochTimestamp();
   stateEntries.push(dbState);
   
   dbState = new DBState();
   dbState.name = `${prefixName}_T`;
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



// name, valueString, valueNumber,timestamp, comment
// 'XRP_N', '', '33239817', '1669640060', ''
// 'XRP_Nbottom', '', '33157114', '1670277952', ''
// 'XRP_NbottomTime', '', '1669379742', '1670277952', ''
// 'XRP_state', 'sync', '-1', '1669640060', ''
// 'XRP_T', '', '33239822', '1669640060', ''

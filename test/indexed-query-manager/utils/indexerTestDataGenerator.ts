import { ChainType, prefix0x, unPrefix0x } from "@flarenetwork/mcc";
import { EntityManager } from "typeorm";
import { DBTransactionBase } from "../../../lib/entity/indexer/dbTransaction";
import { toHex } from "../../../lib/verification/attestation-types/attestation-types-helpers";
import fs from "fs";
import Web3 from "web3";
import { DBState } from "../../../lib/entity/indexer/dbState";
import { getSourceName, SourceId } from "../../../lib/verification/sources/sources";
import { getUnixEpochTimestamp } from "../../../lib/utils/utils";
import { DBBlockBase } from "../../../lib/entity/indexer/dbBlock";
import { ARPayment } from "../../../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../../../lib/verification/generated/attestation-types-enum";

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

export const ZERO_PAYMENT_REFERENCE = "0000000000000000000000000000000000000000000000000000000000000000";

export function testBlockHash(blockNumber: number): string {
   return unPrefix0x(Web3.utils.soliditySha3(toHex(blockNumber, 32)));
}

export function testTransactionHash(transactionIndex: number, blockNumber: number) {
   let txHash = Web3.utils.soliditySha3(toHex(transactionIndex, 32));
   let blockHash = testBlockHash(blockNumber);
   return unPrefix0x(Web3.utils.soliditySha3(txHash + blockHash));
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
         paymentReference = unPrefix0x(toHex(parseInt(transaction.transactionId.slice(-10), 16), 32))
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
      // if(blockNumber === endBlock) {
      //    console.log(timestamp);
      // }
   }
   let stateEntries: DBState[] = [];
   let prefixName = getSourceName(chainType).toUpperCase();
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
   return `${getSourceName(chainType)}_T`;
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

export async function selectedReferencedTx(
   entityManager: EntityManager,
   dbTxClass: any,
   blockNumber: number
): Promise<DBTransactionBase> {
   let query2 = entityManager
      .createQueryBuilder(dbTxClass, "transaction")
      .where("transaction.blockNumber = :blockNumber", { blockNumber })
      .andWhere("transaction.paymentReference != :paymentReference", { paymentReference: ZERO_PAYMENT_REFERENCE })
      .orderBy("transaction.transactionId", "ASC");
   return await query2.getOne() as any as DBTransactionBase;
}

export async function selectBlock(
   entityManager: EntityManager,
   blockClass: any,
   blockNumber: number
): Promise<DBBlockBase> {
   let query = entityManager
      .createQueryBuilder(blockClass, "block")
      .where("block.blockNumber = :blockNumber", { blockNumber });
   return await query.getOne() as any as DBBlockBase;
}

export async function testPaymentRequest(
   entityManager: EntityManager,
   dbTransaction: DBTransactionBase,
   blockClass: any,
   numberOfConfirmations: number,
   chainType: ChainType
) {
   let block = await selectBlock(entityManager, blockClass, dbTransaction.blockNumber + numberOfConfirmations);
   return {
      attestationType: AttestationType.Payment,
      sourceId: chainType as any as SourceId,
      upperBoundProof: prefix0x(block.blockHash),
      id: prefix0x(dbTransaction.transactionId),
      inUtxo: 0,
      utxo: 0
   } as ARPayment;
}

// name, valueString, valueNumber,timestamp, comment
// 'XRP_N', '', '33239817', '1669640060', ''
// 'XRP_Nbottom', '', '33157114', '1670277952', ''
// 'XRP_NbottomTime', '', '1669379742', '1670277952', ''
// 'XRP_state', 'sync', '-1', '1669640060', ''
// 'XRP_T', '', '33239822', '1669640060', ''

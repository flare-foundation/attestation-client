import {
  AlgoBlock,
  AlgoTransaction,
  ChainType,
  IBlock,
  ITransaction,
  unPrefix0x,
  UtxoBlock,
  UtxoTransaction,
  XrpBlock,
  XrpTransaction,
} from "@flarenetwork/mcc";
import { DBTransactionBase, IDBTransactionBase } from "../../entity/indexer/dbTransaction";
import { prepareString } from "../../utils/utils";
import { Indexer } from "../indexer";

//No need for indexer to be involved!! We only need active index from interlace
//Why is this async???
/**
 * Creates the database entity for a confirmed transaction obtained from the MCC output to be put into the indexer database.
 * @param indexer the indexer
 * @param block block of the transaction (IBlock)
 * @param txData transaction data obtained from MCC (ITransaction)
 * @returns
 */
// async function augmentTransactionBase(indexer: Indexer, block: IBlock, txData: ITransaction): Promise<DBTransactionBase> {
//   const table = new (indexer.getActiveTransactionWriteTable() as any)();

//   table.chainType = indexer.cachedClient.client.chainType;
//   table.transactionId = prepareString(txData.stdTxid, 64);
//   table.blockNumber = block.number;
//   table.timestamp = block.unixTimestamp;
//   table.transactionType = txData.type;
//   table.isNativePayment = txData.isNativePayment;
//   table.paymentReference = prepareString(unPrefix0x(txData.stdPaymentReference), 64);
//   table.response = prepareString(JSON.stringify({ data: txData.data, additionalData: txData.additionalData }), 16 * 1024);

//   return table;
// }

//Do we want the whole block just for two lines???
function augmentTransactionBase(dbTransaction: IDBTransactionBase, chainType: ChainType, block: IBlock, txData: ITransaction): DBTransactionBase {
  const txEntity = new dbTransaction();

  txEntity.chainType = chainType;
  txEntity.transactionId = prepareString(txData.stdTxid, 64);
  txEntity.blockNumber = block.number;
  txEntity.timestamp = block.unixTimestamp;
  txEntity.transactionType = txData.type;
  txEntity.isNativePayment = txData.isNativePayment;
  txEntity.paymentReference = prepareString(unPrefix0x(txData.stdPaymentReference), 64);
  txEntity.response = prepareString(JSON.stringify({ data: txData.data, additionalData: txData.additionalData }), 16 * 1024);

  return txEntity;
}

// 1st and 3rd functions are the same, just different name!

/**
 * Creates the database entity for a confirmed transaction obtained from the MCC output to be put into the indexer database.
 * Specialization of the function for ALGO.
 * @param indexer the indexer
 * @param block block of the transaction (IBlock)
 * @param txData transaction data obtained from MCC (ITransaction)
 * @returns
 */
export function augmentTransactionAlgo(dbTransaction: any, block: AlgoBlock, txData: AlgoTransaction): DBTransactionBase {
  const res = augmentTransactionBase(dbTransaction, ChainType.ALGO, block, txData);

  return res as DBTransactionBase;
}

/**
 * Creates the database entity for a confirmed transaction obtained from the MCC output to be put into the indexer database.
 * Specialization of the function for UTXO (Bitcon based) chains.
 * Promise in place of txDataPromise is due to non-blocking optimization when reading input transactions of the transaction.
 * @param indexer the indexer
 * @param block block of the transaction (IBlock)
 * @param txDataPromise promise of transaction data obtained from MCC (ITransaction)
 * @returns
 */
export async function augmentTransactionUtxo(
  dbTransaction: any,
  chainType: ChainType,
  block: UtxoBlock,
  txDataPromise: Promise<UtxoTransaction>
): Promise<DBTransactionBase> {
  const txData = await txDataPromise;
  const res = augmentTransactionBase(dbTransaction, chainType, block, txData);

  return res as DBTransactionBase;
}

/**
 * Creates the database entity for a confirmed transaction obtained from the MCC output to be put into the indexer database.
 * Specialization of the function for XRP.
 * @param indexer the indexer
 * @param block block of the transaction (IBlock)
 * @param txData transaction data obtained from MCC (ITransaction)
 * @returns
 */
export function augmentTransactionXrp(dbTransaction: any, block: XrpBlock, txData: XrpTransaction): DBTransactionBase {
  const res = augmentTransactionBase(dbTransaction, ChainType.XRP, block, txData);

  return res as DBTransactionBase;
}

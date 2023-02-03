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
import { stringify } from "safe-stable-stringify";
import { DBTransactionALGO0, DBTransactionBase, DBTransactionXRP0, IDBTransactionBase } from "../../entity/indexer/dbTransaction";
import { prepareString } from "../../utils/helpers/utils";

/**
 * Creates the database entity for a confirmed transaction obtained from the MCC output to be put into the indexer database.
 * @param dbTransaction
 * @param chainType
 * @param block
 * @param txData
 * @returns
 */
function augmentTransactionBase(dbTransaction: IDBTransactionBase, chainType: ChainType, block: IBlock, txData: ITransaction): DBTransactionBase {
  const txEntity = new dbTransaction();

  txEntity.chainType = chainType;
  txEntity.transactionId = prepareString(txData.stdTxid, 64);
  txEntity.blockNumber = block.number;
  txEntity.timestamp = block.unixTimestamp;
  txEntity.transactionType = txData.type;
  txEntity.isNativePayment = txData.isNativePayment;
  txEntity.paymentReference = prepareString(unPrefix0x(txData.stdPaymentReference), 64);
  txEntity.response = prepareString(stringify({ data: txData.data, additionalData: txData.additionalData }), 16 * 1024);

  return txEntity;
}

/**
 * Creates the database entity for a confirmed transaction obtained from the MCC output to be put into the indexer database.
 * Specialization of the function for ALGO.
 * @param dbTransaction
 * @param block
 * @param txData
 * @returns
 */
export function augmentTransactionAlgo(block: AlgoBlock, txData: AlgoTransaction): DBTransactionBase {
  const res = augmentTransactionBase(DBTransactionALGO0, ChainType.ALGO, block, txData);

  return res as DBTransactionBase;
}

/**
 * Creates the database entity for a confirmed transaction obtained from the MCC output to be put into the indexer database.
 * Specialization of the function for UTXO (Bitcoin based) chains.
 * Promise in place of txDataPromise is due to non-blocking optimization when reading input transactions of the transaction.
 * @param dbTransaction
 * @param chainType
 * @param block
 * @param txDataPromise
 * @returns
 */
export async function augmentTransactionUtxo(
  dbTransaction: IDBTransactionBase,
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
 * @param dbTransaction
 * @param block
 * @param txData
 * @returns
 */
export function augmentTransactionXrp(block: XrpBlock, txData: XrpTransaction): DBTransactionBase {
  const res = augmentTransactionBase(DBTransactionXRP0, ChainType.XRP, block, txData);

  return res as DBTransactionBase;
}

import { AlgoBlock, AlgoTransaction, IBlock, ITransaction, unPrefix0x, UtxoBlock, UtxoTransaction, XrpBlock, XrpTransaction } from "@flarenetwork/mcc";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { prepareString } from "../../utils/utils";
import { Indexer } from "../indexer";
import { stringify } from "safe-stable-stringify";

/**
 * Creates the database entity for a confirmed transaction obtained from the MCC output to be put into the indexer database.
 * @param indexer the indexer
 * @param block block of the transaction (IBlock)
 * @param txData transaction data obtained from MCC (ITransaction)
 * @returns
 */
async function augmentTransactionBase(indexer: Indexer, block: IBlock, txData: ITransaction): Promise<DBTransactionBase> {
  const table = new (indexer.getActiveTransactionWriteTable() as any)();

  table.chainType = indexer.cachedClient.client.chainType;
  table.transactionId = prepareString(txData.stdTxid, 64);
  table.blockNumber = block.number;
  table.timestamp = block.unixTimestamp;
  table.transactionType = txData.type;
  table.isNativePayment = txData.isNativePayment;
  table.paymentReference = prepareString(unPrefix0x(txData.stdPaymentReference), 64);
  table.response = prepareString(stringify({ data: txData.data, additionalData: txData.additionalData }), 16 * 1024);

  return table;
}

/**
 * Creates the database entity for a confirmed transaction obtained from the MCC output to be put into the indexer database.
 * Specialization of the function for ALGO.
 * @param indexer the indexer
 * @param block block of the transaction (IBlock)
 * @param txData transaction data obtained from MCC (ITransaction)
 * @returns
 */
export async function augmentTransactionAlgo(indexer: Indexer, block: AlgoBlock, txData: AlgoTransaction): Promise<DBTransactionBase> {
  const res = await augmentTransactionBase(indexer, block, txData);

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
export async function augmentTransactionUtxo(indexer: Indexer, block: UtxoBlock, txDataPromise: Promise<UtxoTransaction>): Promise<DBTransactionBase> {
  const txData = await txDataPromise;
  const res = await augmentTransactionBase(indexer, block, txData);

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
export async function augmentTransactionXrp(indexer: Indexer, block: XrpBlock, txData: XrpTransaction): Promise<DBTransactionBase> {
  const res = await augmentTransactionBase(indexer, block, txData);

  return res as DBTransactionBase;
}

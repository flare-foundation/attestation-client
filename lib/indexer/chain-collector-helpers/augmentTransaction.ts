import { AlgoBlock, AlgoTransaction, IBlock, ITransaction, unPrefix0x, UtxoBlock, UtxoTransaction, XrpBlock, XrpTransaction } from "@flarenetwork/mcc";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { prepareString } from "../../utils/utils";
import { Indexer } from "../indexer";

async function augmentTransactionBase(indexer: Indexer, block: IBlock, txData: ITransaction): Promise<DBTransactionBase> {
   const table = indexer.getActiveTransactionWriteTable();

   table.chainType = indexer.cachedClient.client.chainType;
   table.transactionId = prepareString(txData.stdTxid, 64);
   table.blockNumber = block.number;
   table.timestamp = txData.unixTimestamp;
   table.transactionType = txData.type;
   table.isNativePayment = txData.isNativePayment;
   table.paymentReference = prepareString(unPrefix0x(txData.stdPaymentReference), 64);
   table.response = prepareString(JSON.stringify({ data: txData.data, additionalData: txData.additionalData }), 16 * 1024);

   return table;
}

export async function augmentTransactionAlgo(indexer: Indexer, block: AlgoBlock, txData: AlgoTransaction): Promise<DBTransactionBase> {
   const res = await augmentTransactionBase(indexer, block, txData)

   return res as DBTransactionBase
}

export async function augmentTransactionUtxo(indexer: Indexer, block: UtxoBlock, txDataPromise: Promise<UtxoTransaction>): Promise<DBTransactionBase> {
   const txData = await txDataPromise;
   const res = await augmentTransactionBase(indexer, block, txData);

   return res as DBTransactionBase
}

export async function augmentTransactionXrp(indexer: Indexer, block: XrpBlock, txData: XrpTransaction): Promise<DBTransactionBase> {
   const res = await augmentTransactionBase(indexer, block, txData);

   return res as DBTransactionBase
}
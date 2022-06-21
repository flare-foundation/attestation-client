import { AlgoBlock, AlgoTransaction, ChainType, IBlock, ITransaction, unPrefix0x, UtxoBlock, UtxoTransaction, XrpBlock, XrpTransaction } from "@flarenetwork/mcc";
import { DBTransactionALGO0, DBTransactionALGO1, DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1, DBTransactionDOGE0, DBTransactionDOGE1, DBTransactionLTC0, DBTransactionLTC1, DBTransactionXRP0, DBTransactionXRP1 } from "../../entity/indexer/dbTransaction";
import { prepareString } from "../../utils/utils";
import { Indexer } from "../indexer";

function DBTransaction(chainType: ChainType, index: number) {
   switch (chainType) {
      case ChainType.XRP:
         return new (index === 0 ? DBTransactionXRP0 : DBTransactionXRP1)();
      case ChainType.BTC:
         return new (index === 0 ? DBTransactionBTC0 : DBTransactionBTC1)();
      case ChainType.LTC:
         return new (index === 0 ? DBTransactionLTC0 : DBTransactionLTC1)();
      case ChainType.DOGE:
         return new (index === 0 ? DBTransactionDOGE0 : DBTransactionDOGE1)();
      case ChainType.ALGO:
         return new (index === 0 ? DBTransactionALGO0 : DBTransactionALGO1)();
      default:
         return null;
   }
}

async function augmentTransactionBase(indexer: Indexer, block: IBlock, txData: ITransaction): Promise<DBTransactionBase> {
   const tableIndex = indexer.interlace.getActiveIndex();
   const res = DBTransaction(indexer.cachedClient.client.chainType, tableIndex);

   res.chainType = indexer.cachedClient.client.chainType;
   res.transactionId = prepareString(txData.stdTxid, 64);
   res.blockNumber = block.number;
   res.timestamp = txData.unixTimestamp;
   res.transactionType = txData.type;
   res.isNativePayment = txData.isNativePayment;
   res.paymentReference = prepareString(unPrefix0x(txData.stdPaymentReference), 64);
   res.response = prepareString(JSON.stringify({ data: txData.data, additionalData: txData.additionalData }), 16 * 1024);

   return res;
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
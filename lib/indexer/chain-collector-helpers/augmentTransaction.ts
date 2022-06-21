import { AlgoBlock, AlgoTransaction, ChainType, IBlock, ITransaction, txIdToHexNo0x, unPrefix0x, UtxoBlock, UtxoTransaction, XrpBlock, XrpTransaction } from "@flarenetwork/mcc";
import { CachedMccClient } from "../../caching/CachedMccClient";
import { DBTransactionALGO0, DBTransactionALGO1, DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1, DBTransactionDOGE0, DBTransactionDOGE1, DBTransactionLTC0, DBTransactionLTC1, DBTransactionXRP0, DBTransactionXRP1 } from "../../entity/indexer/dbTransaction";
import { prepareString } from "../../utils/utils";
import { Indexer } from "../indexer";
import { SECONDS_PER_DAY } from "../indexer-utils";

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
   const res = DBTransaction(indexer.cachedClient.client.chainType, tableIndex );

   res.chainType = indexer.cachedClient.client.chainType;
   res.transactionId = prepareString(txData.txid, 64);
   res.blockNumber = block.number;
   res.timestamp = txData.unixTimestamp;
   res.transactionType = txData.type;
   res.isNativePayment = txData.isNativePayment;
   res.response = prepareString(JSON.stringify({ data: txData.data, additionalData: txData.additionalData }), 16 * 1024);

   return res;
}


export async function augmentTransactionAlgo(indexer: Indexer, block: AlgoBlock, txData: AlgoTransaction): Promise<DBTransactionBase> {
   const res = await augmentTransactionBase(indexer, block, txData)

   // Algo specific conversion of transaction hashes to hex 
   res.transactionId = txIdToHexNo0x(txData.txid);
   res.paymentReference = prepareString(unPrefix0x(txData.stdPaymentReference), 64);
   return res as DBTransactionBase
}

export async function augmentTransactionUtxo(indexer: Indexer, block: UtxoBlock, txDataPromise: Promise<UtxoTransaction>): Promise<DBTransactionBase> {

   const txData = await txDataPromise;

   const res = await augmentTransactionBase(indexer, block, txData);

   if (txData.reference.length === 1) {
      res.paymentReference = prepareString(unPrefix0x(txData.stdPaymentReference), 64);
   }
   // we get block number on top level when we add transactions from indexer into processing queue
   // res.blockNumber = await getRandom();

   return res as DBTransactionBase
}

export async function augmentTransactionXrp(indexer: Indexer, block: XrpBlock, txData: XrpTransaction): Promise<DBTransactionBase> {
   const res = await augmentTransactionBase(indexer, block, txData);

   res.timestamp = block.unixTimestamp;

   if (txData.reference.length === 1) {
      res.paymentReference = prepareString(unPrefix0x(txData.stdPaymentReference), 64);
   }

   return res as DBTransactionBase
}
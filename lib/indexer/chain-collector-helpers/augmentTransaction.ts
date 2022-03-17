import { AlgoBlock, AlgoTransaction, ChainType, IBlock, ITransaction, txIdToHexNo0x, UtxoBlock, UtxoTransaction, XrpBlock, XrpTransaction } from "flare-mcc";
import { CachedMccClient } from "../../caching/CachedMccClient";
import { DBTransactionALGO0, DBTransactionALGO1, DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1, DBTransactionDOGE0, DBTransactionDOGE1, DBTransactionLTC0, DBTransactionLTC1, DBTransactionXRP0, DBTransactionXRP1 } from "../../entity/dbTransaction";
import { prepareString } from "../../utils/utils";

const Csec2day = 60 * 60 * 24;
function getBlockSaveEpoch(time: number): number {
   // 2022/01/01 00:00:00
   return Math.floor((time - 1640991600) / (14 * Csec2day));
}

function DBTransaction(chainType: ChainType, index: number) {
   switch (chainType) {
       case ChainType.XRP:
           return new (index ? DBTransactionXRP0 : DBTransactionXRP1)();
       case ChainType.BTC:
         return new (index ? DBTransactionBTC0 : DBTransactionBTC1)();
       case ChainType.LTC:
         return new (index ? DBTransactionLTC0 : DBTransactionLTC1)();
       case ChainType.DOGE:
           return new (index ? DBTransactionDOGE0 : DBTransactionDOGE1)();
       case ChainType.ALGO:
           return new (index ? DBTransactionALGO0 : DBTransactionALGO1)();
       default:
           return null;
   }
}

async function augmentTransactionBase(client: CachedMccClient<any, any>, block: IBlock, txData: ITransaction): Promise<DBTransactionBase> {
   const epoch = getBlockSaveEpoch(block.unixTimestamp);
   const res = DBTransaction(client.client.chainType, epoch & 1);

   if( !txData ) {
      //debugger;
      let debug=1;
   }

   res.chainType = client.client.chainType;
   res.transactionId = prepareString(txData.hash, 64);
   res.blockNumber = block.number;
   res.timestamp = txData.unixTimestamp;
   res.transactionType = txData.type;
   res.isNativePayment = txData.isNativePayment;

   // TODO calculate hash
   // res.hashVerify = prepareString(res.hashVerify, 64);

   res.response = prepareString( JSON.stringify({data : txData.data, additionalData: txData.additionalData }) , 16 * 1024 );

   return res;
}


export async function augmentTransactionAlgo(client: CachedMccClient<any, any>, block: AlgoBlock, txData: AlgoTransaction): Promise<DBTransactionBase> {
   const res = await augmentTransactionBase(client,block,txData)

   // Algo specific conversion of transaction hashes to hex 
   res.transactionId = txIdToHexNo0x(txData.hash);
   res.paymentReference = prepareString(txData.reference[0], 64);
   return res as DBTransactionBase
}

export async function augmentTransactionUtxo(client: CachedMccClient<any, any>, block: UtxoBlock, txDataPromise: Promise<UtxoTransaction>): Promise<DBTransactionBase> {

   const txData = await txDataPromise;

   const res = await augmentTransactionBase(client,block,txData);

   if (txData.reference.length === 1) {
      res.paymentReference = prepareString(txData.reference[0], 64);
   }
   // we get block number on top level when we add transactions from indexer into processing queue
   // res.blockNumber = await getRandom();

   return res as DBTransactionBase
}

export async function augmentTransactionXrp(client: CachedMccClient<any, any>, block: XrpBlock, txData: XrpTransaction): Promise<DBTransactionBase> {
   const res = await augmentTransactionBase(client,block,txData);

   res.timestamp = block.unixTimestamp;

   if (txData.reference.length === 1) {
      res.paymentReference = prepareString(txData.reference[0],64);
   }

   return res as DBTransactionBase
}
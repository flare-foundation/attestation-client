import { AlgoBlock, AlgoTransaction, txIdToHexNo0x, UtxoBlock, UtxoTransaction, XrpBlock, XrpTransaction } from "flare-mcc";
import { CachedMccClient } from "../../caching/CachedMccClient";
import { DBTransactionALGO0, DBTransactionALGO1, DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1, DBTransactionXRP0, DBTransactionXRP1 } from "../../entity/dbTransaction";
import { prepareString } from "../../utils/utils";

const Csec2day = 60 * 60 * 24;
function getBlockSaveEpoch(time: number): number {
   // 2022/01/01 00:00:00
   return Math.floor((time - 1640991600) / (14 * Csec2day));
}

export async function augmentTransactionAlgo(client: CachedMccClient<any, any>, block: AlgoBlock, txData: AlgoTransaction): Promise<DBTransactionBase> {
   // todo: make for all 
   const epoch = getBlockSaveEpoch(block.unixTimestamp);
   const tableIndex = epoch & 1;
   const res = new (tableIndex ? DBTransactionALGO0 : DBTransactionALGO1)();
   //const res = new DBTransactionBase();
   res.blockNumber = block.number;
   res.chainType = client.client.chainType;

   // Algo specific conversion of transaction hashes to hex 
   res.transactionId = txIdToHexNo0x(txData.hash);

   // If there is note other
   res.paymentReference = txData.reference[0]
   res.timestamp = txData.unixTimestamp

   // todo: move into HUB function
   res.transactionId = prepareString(res.transactionId, 64);
   res.paymentReference = prepareString(res.paymentReference, 64);
   res.hashVerify = prepareString(res.hashVerify, 64);

   //res.response = JSON.stringify(txData.data)
   return res as DBTransactionBase
}

export async function augmentTransactionUtxo(client: CachedMccClient<any, any>, block: UtxoBlock, txData: UtxoTransaction): Promise<DBTransactionBase> {

   // todo: make for all 
   const epoch = getBlockSaveEpoch(block.unixTimestamp);
   const tableIndex = epoch & 1;
   const res = new (tableIndex ? DBTransactionBTC0 : DBTransactionBTC1)();

   res.blockNumber = block.number;
   res.chainType = client.client.chainType;
   res.transactionId = txData.hash;

   const paymentRef = txData.reference
   if (paymentRef.length === 1) {
      res.paymentReference = paymentRef[0]
   }
   // we get block number on top level when we add transactions from indexer into processing queue
   // res.blockNumber = await getRandom();

   res.timestamp = txData.unixTimestamp

   // todo: move into HUB function
   res.transactionId = prepareString(res.transactionId, 64);
   res.paymentReference = prepareString(res.paymentReference, 64);
   res.hashVerify = prepareString(res.hashVerify, 64);

   //res.response = JSON.stringify(txData.data)
   return res as DBTransactionBase
}

export async function augmentTransactionXrp(client: CachedMccClient<any, any>, block: XrpBlock, txData: XrpTransaction): Promise<DBTransactionBase> {
   // todo: make for all 
   const epoch = getBlockSaveEpoch(block.unixTimestamp);
   const tableIndex = epoch & 1;
   const res = new (tableIndex ? DBTransactionXRP0 : DBTransactionXRP1)();
   //const res = new DBTransactionBase();

   res.blockNumber = block.number;
   res.chainType = client.client.chainType;
   res.transactionId = txData.hash;

   const paymentRef = txData.reference
   if (paymentRef.length === 1) {
      res.paymentReference = paymentRef[0]
   }

   // todo: move into HUB function
   res.transactionId = prepareString(res.transactionId, 64);
   res.paymentReference = prepareString(res.paymentReference, 64);
   res.hashVerify = prepareString(res.hashVerify, 64);

   res.timestamp = block.unixTimestamp
   //res.response = JSON.stringify(txData)
   return res as DBTransactionBase
}
import { AlgoBlock, AlgoTransaction, base64ToHex, BlockBase, IAlgoGetBlockRes, IAlgoGetFullTransactionRes, IUtxoGetBlockRes, ReadRpcInterface, txIdToHexNo0x, UtxoBlock, UtxoTransaction } from "flare-mcc";
import { IUtxoGetFullTransactionRes } from "flare-mcc/dist/types/utxoTypes";
import { CachedMccClient } from "../../caching/CachedMccClient";
import { DBTransactionBase } from "../../entity/dbTransaction";


export async function augmentTransactionAlgo(client: CachedMccClient<any,any>, block: AlgoBlock, txData: AlgoTransaction): Promise<DBTransactionBase> {
   const res = new DBTransactionBase();
   res.blockNumber = block.number;
   res.chainType = client.client.chainType;

   // Algo specific conversion of transaction hashes to hex 
   res.transactionId = txIdToHexNo0x(txData.hash);

   // If there is note other
   res.paymentReference = txData.reference[0]
   res.timestamp = txData.unixTimestamp

   res.response = JSON.stringify(txData.data)
   return res as DBTransactionBase
}

export async function augmentTransactionUtxo(client: CachedMccClient<any,any>, block: UtxoBlock, txData: UtxoTransaction): Promise<DBTransactionBase> {
   const res = new DBTransactionBase();
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

   res.response = JSON.stringify(txData.data)
   return res as DBTransactionBase
}

export async function augmentTransactionXrp(client: ReadRpcInterface, block: any, txData: any): Promise<DBTransactionBase> {
   const res = new DBTransactionBase();
   res.blockNumber = block.result.ledger_index;
   res.chainType = client.chainType;
   res.transactionId = txData.hash;

   res.response = JSON.stringify(txData)
   return res as DBTransactionBase
}
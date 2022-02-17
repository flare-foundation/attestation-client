import { RPCInterface } from "flare-mcc";
import { DBTransactionBase } from "../../entity/dbTransaction";
import { augmentBlockSig, augmentTransactionSig, onSaveSig, preprocessBlockSig, readTransactionSig } from "./types";



/**
 * 
 * @param client Mcc client for chain we are collecting from
 * @param block block data from underlying chain
 * @param preprocessBlock Callback function that pre-process the block data, used if transaction data is in the block
 * @param readTransaction Method that gets all of the needed transaction data from the chain
 * @param augmentTransaction Method to prepare transaction data to be saved into indexer
 * @param augmentBlock Method to preprocess block information 
 * @param onSave callback to save transaction data and index if block was successfully saved or not
 */
export async function processBlockTransactionsGeneric<B, T>(
   client: RPCInterface,
   block: B,  // Type is specific to each underlying chain
   preprocessBlock: preprocessBlockSig<B,T>,
   readTransaction: readTransactionSig<T>, // getFullTransaction
   augmentTransaction: augmentTransactionSig<B,T> ,
   augmentBlock: augmentBlockSig<B>,
   onSave: onSaveSig
) {
   // We preprocess the block
   //  - For each transaction in block we generate a mapper from tx hash to its data object or in null
   // then we go over all transaction hashes in block and process them further

   // Preprocess transaction 

   const transactionMap = preprocessBlock(block);

   console.log("Transaction map");
   console.log(transactionMap);
   console.log();
   
   // go over all transactions and process them

   const augmentedTransactions:DBTransactionBase[] = []

   const transactionHashes = await client.getTransactionHashesFromBlock(block);

   console.log("Hashes map");
   console.log(transactionHashes);
   console.log();

   for (let txHash of transactionHashes) {
      let txData = transactionMap.get(txHash);
      if (txData === null || txData === undefined ) {
         try{
            txData = await readTransaction(client, txHash);
         } catch (e){
            console.log(e);
            
         }  
      }

      console.log(txData);
      
      const dbData = await augmentTransaction(client, block, txData);
      augmentedTransactions.push(dbData);
   }

   console.log("Augmented map");
   console.log(augmentedTransactions);
   console.log();

   const blockData = await augmentBlock(client, block)

   await onSave(augmentedTransactions);

}

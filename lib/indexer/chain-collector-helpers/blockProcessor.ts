import { AlgoTransaction, BlockBase, UtxoTransaction } from "flare-mcc";
import { LimitingProcessor } from "../../caching/LimitingProcessor";
import { DBTransactionBase } from "../../entity/dbTransaction";
import { augmentBlockUtxo } from "./augmentBlock";
import { augmentTransactionAlgo, augmentTransactionUtxo } from "./augmentTransaction";
import { getFullTransactionUtxo } from "./readTransaction";
import { onSaveSig } from "./types";

export class UtxoBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: BlockBase<any>, onSave: onSaveSig) {
    let txPromises = block.transactionHashes.map(async (txid) => {
      let processed = (await this.call(() => getFullTransactionUtxo(this.client, txid, this))) as UtxoTransaction;
      return augmentTransactionUtxo(this.client, block, processed);
    });

    const transDb = await Promise.all(txPromises);

    const blockDb = augmentBlockUtxo(this.client.client, block);

    onSave(blockDb, transDb);
  }
}

export class AlgoBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: BlockBase<any>, onSave: onSaveSig) {
    console.log("Algo block processing");
    console.log(block.data.transactions);

    let txPromises = block.data.transactions.map((txObject) => {
      console.log(txObject);
      const getTxObject = {
        currentRound: block.number,
        transaction: txObject,
      };
      let processed = new AlgoTransaction(getTxObject);
      return augmentTransactionAlgo(this.client, block, processed);
    });
    const transDb = await Promise.all(txPromises) as DBTransactionBase[];

    const blockDb = augmentBlockUtxo(this.client.client, block);
    
    onSave(blockDb, transDb);
  }
}

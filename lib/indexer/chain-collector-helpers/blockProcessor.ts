import { AlgoBlock, AlgoTransaction, ChainType, UtxoBlock, UtxoTransaction, XrpBlock, XrpTransaction } from "flare-mcc";
import { LimitingProcessor } from "../../caching/LimitingProcessor";
import { DBTransactionBase } from "../../entity/dbTransaction";
import { getGlobalLogger } from "../../utils/logger";
import { augmentBlock, augmentBlockAlgo, augmentBlockUtxo } from "./augmentBlock";
import { augmentTransactionAlgo, augmentTransactionUtxo, augmentTransactionXrp } from "./augmentTransaction";
import { getFullTransactionUtxo } from "./readTransaction";
import { onSaveSig } from "./types";


export function BlockProcessor(chainType: ChainType) {
  switch (chainType) {
    case ChainType.XRP:
      return XrpBlockProcessor
    case ChainType.BTC:
    case ChainType.LTC:
    case ChainType.DOGE:
      return UtxoBlockProcessor
    case ChainType.ALGO:
      return AlgoBlockProcessor
    default:
      return null;
  }
}

export class UtxoBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: UtxoBlock, onSave: onSaveSig) {
    this.block = block;
    // let txPromises = block.transactionHashes.map(async (txid) => {
    //   let processed = (await this.call(() => getFullTransactionUtxo(this.client, txid, this))) as UtxoTransaction;
    //   return augmentTransactionUtxo(this.client, block, processed);
    // });
    let txPromises = block.data.tx.map( (txObject) => {
      const getTxObject = {
        blockhash: block.hash,
        time: block.unixTimestamp,
        confirmations: 1, // This is the block 
        blocktime: block.unixTimestamp,
        ...txObject,
      };
      let processed = new UtxoTransaction(getTxObject);
      return this.call(() => getFullTransactionUtxo(this.client, processed, this)) as Promise<UtxoTransaction>; 
    });

    // todo: [optimization] @Luka this primise can be ommited if augmentTransactionUtxo would take this promise
    //const transDbres = await Promise.all(txPromises);

    const transDbPromisses = txPromises.map( processed => augmentTransactionUtxo(this.client, block, processed ) );

    //getGlobalLogger().debug(`UtxoBlockProcessor 1 ${block.number}`);

    const transDb = await Promise.all(transDbPromisses);

    //getGlobalLogger().debug(`UtxoBlockProcessor 2 ${block.number}`);

    const blockDb = await augmentBlockUtxo(block);

    this.stop();

    //getGlobalLogger().debug(`UtxoBlockProcessor 3 ${block.number}`);

    onSave(blockDb, transDb);
  }
}

export class AlgoBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: AlgoBlock, onSave: onSaveSig) {
    this.block = block;
    let txPromises = block.data.transactions.map((txObject) => {
      const getTxObject = {
        currentRound: block.number,
        transaction: txObject,
      };
      let processed = new AlgoTransaction(getTxObject);
      return augmentTransactionAlgo(this.client, block, processed);
    });
    const transDb = await Promise.all(txPromises) as DBTransactionBase[];
    this.pause();
    const blockDb = await augmentBlockAlgo(block);

    onSave(blockDb, transDb);
  }
}

export class XrpBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: XrpBlock, onSave: onSaveSig) {
    this.block = block;
    let txPromises = block.data.result.ledger.transactions.map((txObject) => {
      const newObj = {
        result: txObject
      }
      // @ts-ignore
      let processed = new XrpTransaction(newObj);
      return augmentTransactionXrp(this.client, block, processed);
    });
    const transDb = await Promise.all(txPromises) as DBTransactionBase[];
    this.pause();
    const blockDb = await augmentBlock(block);

    onSave(blockDb, transDb);
  }
}
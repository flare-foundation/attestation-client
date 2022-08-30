import { AlgoBlock, ChainType, IBlock, Managed, traceFunction, UtxoBlock, UtxoTransaction, XrpBlock, XrpTransaction, XRP_UTD } from "@flarenetwork/mcc";
import { LimitingProcessor } from "../../caching/LimitingProcessor";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { retryMany } from "../../utils/PromiseTimeout";
import { criticalAsync } from "../indexer-utils";
import { augmentBlock } from "./augmentBlock";
import { augmentTransactionAlgo, augmentTransactionUtxo, augmentTransactionXrp } from "./augmentTransaction";
import { getFullTransactionUtxo } from "./readTransaction";
import { onSaveSig } from "./types";

export function BlockProcessor(chainType: ChainType) {
  switch (chainType) {
    case ChainType.XRP:
      return XrpBlockProcessor;
    case ChainType.BTC:
    case ChainType.LTC:
      return UtxoBlockProcessor;
    case ChainType.DOGE:
      return DogeBlockProcessor;
    case ChainType.ALGO:
      return AlgoBlockProcessor;
    default:
      return null;
  }
}

@Managed()
export class UtxoBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: IBlock, onSave: onSaveSig) {
    this.block = block as UtxoBlock;

    let txPromises = block.data.tx.map((txObject) => {
      const getTxObject = {
        blockhash: block.stdBlockHash,
        time: block.unixTimestamp,
        confirmations: 1, // This is the block
        blocktime: block.unixTimestamp,
        ...txObject,
      };
      let processed = new UtxoTransaction(getTxObject);
      return this.call(() => traceFunction( ()=>getFullTransactionUtxo(this.client, processed, this)) as Promise<UtxoTransaction> );
    });

    const transDbPromisses = txPromises.map((processed) => async () => {
      return await augmentTransactionUtxo(this.indexer, block, processed);
    });

    const transDb = (await retryMany(`UtxoBlockProcessor::initializeJobs`, transDbPromisses)) as DBTransactionBase[];

    if (!transDb) {
      return;
    }

    const blockDb = await augmentBlock(this.indexer, block);

    this.stop();

    criticalAsync(`UtxoBlockProcessor::initializeJobs exception: `, () => onSave(blockDb, transDb));
  }
}

@Managed()
export class DogeBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: IBlock, onSave: onSaveSig) {
    this.registerTopLevelJob();
    this.block = block as UtxoBlock;

    let preprocesedTxPromises = block.stdTransactionIds.map((txid: string) => {
      // the in-transactions are prepended to queue in order to process them earlier
      return () => this.call(() => this.client.getTransaction(txid), true) as Promise<UtxoTransaction>;
    });

    const awaitedTxIds = (await retryMany(
      `DogeBlockProcessor::preprocess all transactions`,
      preprocesedTxPromises,
      this.settings.timeout,
      this.settings.retry
    )) as UtxoTransaction[];

    let txPromises = awaitedTxIds.map((processed) => {
      return this.call(() => getFullTransactionUtxo(this.client, processed, this)) as Promise<UtxoTransaction>;
    });

    const transDbPromisses = txPromises.map((processed) => async () => {
      return await augmentTransactionUtxo(this.indexer, block, processed);
    });

    const transDb = (await retryMany(
      `DogeBlockProcessor::initializeJobs`,
      transDbPromisses,
      this.settings.timeout,
      this.settings.retry
    )) as DBTransactionBase[];

    if (!transDb) {
      return;
    }

    this.markTopLevelJobDone();

    const blockDb = await augmentBlock(this.indexer, block);

    this.stop();

    criticalAsync(`DogeBlockProcessor::initializeJobs exception: `, () => onSave(blockDb, transDb));
  }
}

@Managed()
export class AlgoBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: IBlock, onSave: onSaveSig) {
    this.block = block as AlgoBlock;
    let txPromises = (block as AlgoBlock).transactions.map((algoTrans) => {
      return async () => {
        return await augmentTransactionAlgo(this.indexer, block as AlgoBlock, algoTrans);
      };
      // return augmentTransactionAlgo(this.client, block, processed);
    });
    const transDb = (await retryMany(`AlgoBlockProcessor::initializeJobs`, txPromises, this.settings.timeout, this.settings.retry)) as DBTransactionBase[];
    this.pause();
    const blockDb = await augmentBlock(this.indexer, block);

    criticalAsync(`AlgoBlockProcessor::initializeJobs exception: `, () => onSave(blockDb, transDb));
  }
}

@Managed()
export class XrpBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: IBlock, onSave: onSaveSig) {
    this.block = block as XrpBlock;
    let txPromises = block.data.result.ledger.transactions.map((txObject) => {
      const newObj = {
        result: txObject,
      };
      newObj.result.date = block.unixTimestamp - XRP_UTD;
      // @ts-ignore
      let processed = new XrpTransaction(newObj);

      return async () => {
        return await augmentTransactionXrp(this.indexer, block, processed);
      };
    });
    const transDb = (await retryMany(`XrpBlockProcessor::initializeJobs`, txPromises, this.settings.timeout, this.settings.retry)) as DBTransactionBase[];
    this.stop();
    const blockDb = await augmentBlock(this.indexer, block);

    criticalAsync(`XrpBlockProcessor::initializeJobs exception: `, () => onSave(blockDb, transDb));
  }
}

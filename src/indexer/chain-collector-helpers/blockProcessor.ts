import { BtcFullBlock, BtcTransaction, ChainType, DogeFullBlock, DogeTransaction, Managed, XrpFullBlock, traceFunction } from "@flarenetwork/mcc";
import { LimitingProcessor } from "../../caching/LimitingProcessor";
import { DBBlockXRP } from "../../entity/indexer/dbBlock";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { retry, retryMany } from "../../utils/helpers/promiseTimeout";

import { criticalAsync, prepareIndexerTables } from "../indexer-utils";
import { augmentBlock } from "./augmentBlock";
import { augmentTransactionUtxo, augmentTransactionXrp } from "./augmentTransaction";
import { FullIndexingOptions, getFullTransactionUtxo } from "./readTransaction";
import { onSaveSig } from "./types";

/**
 * Selector for the class of specialized block processor for each chain.
 * @param chainType chain type
 * @returns relevant class for given `chainType`
 */
export function BlockProcessor(chainType: ChainType) {
  switch (chainType) {
    case ChainType.XRP:
      return XrpBlockProcessor;
    case ChainType.BTC:
      return BtcBlockProcessor;
    case ChainType.DOGE:
      return DogeBlockProcessor;
    default:
      return null;
  }
}

/**
 * Block processor for UTXO chains. It is used for LTC and Bitcon.
 * It is a specialized implementation of `LimitingProcessor`.
 * The block class (IBlock) is expected to have all transactions in
 * `tx` field.
 */
@Managed()
export class DogeBlockProcessor extends LimitingProcessor<DogeFullBlock> {
  async initializeJobs(block: DogeFullBlock, onSave: onSaveSig) {
    this.block = block;

    // TODO: take this from some sort of settings file
    const withDogeFork = true;
    const transactionIndexingOption = FullIndexingOptions.withReference;

    let transactionObjects: DogeTransaction[];
    const txGetter = (txId: string) => this.call(() => retry("getTransaction", () => this.call(() => this.client.getTransaction(txId), true)), false);

    
    if (withDogeFork) {
      transactionObjects = block.transactions;
    } else {
      transactionObjects = await Promise.all(block.transactionIds.map((txId) => txGetter(txId))) as DogeTransaction[];
    }

    const txPromises = transactionObjects.map((txObject) => {
      // Assumption: the promise never fails or is a critical error that halts a process inside the promise
      return getFullTransactionUtxo<DogeFullBlock, DogeTransaction>(this.client, txObject, this, txGetter, transactionIndexingOption) as Promise<DogeTransaction>;
    });

    const chainType = this.client.chainType;
    const dbTableScheme = prepareIndexerTables(chainType);

    const transDbPromises = txPromises.map((processed) => async () => {
      return await augmentTransactionUtxo(dbTableScheme.transactionTable[0], chainType, block, processed);
    });

    const transDb = (await retryMany(`UtxoBlockProcessor::initializeJobs(${block.number})`, transDbPromises)) as DBTransactionBase[];

    if (!transDb) {
      return;
    }

    const blockDb = augmentBlock(dbTableScheme.blockTable, block);

    this.stop();

    // eslint-disable-next-line
    criticalAsync(`UtxoBlockProcessor::initializeJobs(${block.number}) onSave exception: `, () => onSave(blockDb, transDb));
  }
}

/**
 * Block processor for BTC chain utilizing the full transaction verbosity.
 * It is a specialized implementation of `LimitingProcessor`.
 */
@Managed()
export class BtcBlockProcessor extends LimitingProcessor<BtcFullBlock> {
  async initializeJobs(block: BtcFullBlock, onSave: onSaveSig) {
    this.block = block;

    const chainType = this.client.chainType;
    const dbTableScheme = prepareIndexerTables(chainType);

    const transDbPromises = block.transactions.map((processed) => async () => {
      return await augmentTransactionUtxo<BtcTransaction>(dbTableScheme.transactionTable[0], chainType, block, processed);
    });

    const transDb = (await retryMany(`UtxoBlockProcessor::initializeJobs(${block.number})`, transDbPromises)) as DBTransactionBase[];

    if (!transDb) {
      return;
    }

    const blockDb = augmentBlock(dbTableScheme.blockTable, block);

    this.stop();

    // eslint-disable-next-line
    criticalAsync(`UtxoBlockProcessor::initializeJobs(${block.number}) onSave exception: `, () => onSave(blockDb, transDb));
  }
}

/**
 * Block processor for DOGE chain.
 * It is a specialized implementation of `LimitingProcessor`.
 * DOGE API does not contain all transactions in `tx` field so
 * additional reading of transactions from block is needed.
 */
// @Managed()
// export class DogeBlockProcessor extends LimitingProcessor<DogeFullBlock> {
//   async initializeJobs(block: DogeFullBlock, onSave: onSaveSig) {
//     this.registerTopLevelJob();
//     this.block = block as UtxoFullBlock<UtxoTransaction>;

//     // DOGE API does not support returning the list of transactions with block request
//     const preprocesedTxPromises = block.stdTransactionIds.map((txid: string) => {
//       // the in-transactions are prepended to queue in order to process them earlier
//       return () => this.call(() => this.client.getTransaction(txid), true) as Promise<UtxoTransaction>;
//     });

//     const awaitedTxIds = (await retryMany(
//       `DogeBlockProcessor::preprocess all transactions`,
//       preprocesedTxPromises,
//       this.settings.timeout,
//       this.settings.retry
//     )) as UtxoTransaction[];

//     const txPromises = awaitedTxIds.map((processed) => {
//       return this.call(() => getFullTransactionUtxo(this.client, processed, this)) as Promise<UtxoTransaction>;
//     });

//     const transDbPromisses = txPromises.map((processed) => async () => {
//       return await augmentTransactionUtxo(DBTransactionDOGE0, ChainType.DOGE, block, processed);
//     });

//     const transDb = (await retryMany(
//       `DogeBlockProcessor::initializeJobs`,
//       transDbPromisses,
//       this.settings.timeout,
//       this.settings.retry
//     )) as DBTransactionBase[];

//     if (!transDb) {
//       return;
//     }

//     this.markTopLevelJobDone();

//     const blockDb = augmentBlock(DBBlockDOGE, block);

//     this.stop();

//     // eslint-disable-next-line
//     criticalAsync(`DogeBlockProcessor::initializeJobs(${block.number}) onSave exception: `, () => onSave(blockDb, transDb));
//   }
// }

/**
 * Block processor for ALGO chain.
 * It is a specialized implementation of `LimitingProcessor`.
 */
// @Managed()
// export class AlgoBlockProcessor extends LimitingProcessor<any> {
//   async initializeJobs(block: FullBlockBase<any>, onSave: onSaveSig) {
//     this.block = block as AlgoBlock;

//     const txPromises = (block as AlgoBlock).transactions.map((algoTrans) => {
//       return () => {
//         return augmentTransactionAlgo(block as AlgoBlock, algoTrans);
//       };
//     });
//     const transDb = (await retryMany(
//       `AlgoBlockProcessor::initializeJobs(${block.number})`,
//       txPromises,
//       this.settings.timeout,
//       this.settings.retry
//     )) as DBTransactionBase[];
//     this.pause();
//     const blockDb = augmentBlock(DBBlockALGO, block);

//     // eslint-disable-next-line
//     criticalAsync(`AlgoBlockProcessor::initializeJobs(${block.number}) onSave exception: `, () => onSave(blockDb, transDb));
//   }
// }

/**
 * Block processor for XRP chain.
 * It is a specialized implementation of `LimitingProcessor`.
 */
@Managed()
export class XrpBlockProcessor extends LimitingProcessor<XrpFullBlock> {
  async initializeJobs(block: XrpFullBlock, onSave: onSaveSig) {
    this.block = block as XrpFullBlock;

    const txPromises = this.block.transactions.map((tx) => {
      return () => {
        return augmentTransactionXrp(block, tx);
      };
    });

    const transDb = (await retryMany(
      `XrpBlockProcessor::initializeJobs(${block.number})`,
      txPromises,
      this.settings.timeout,
      this.settings.retry
    )) as DBTransactionBase[];
    this.stop();
    const blockDb = augmentBlock(DBBlockXRP, block);

    // eslint-disable-next-line
    criticalAsync(`XrpBlockProcessor::initializeJobs(${block.number}) onSave exception: `, () => onSave(blockDb, transDb));
  }
}

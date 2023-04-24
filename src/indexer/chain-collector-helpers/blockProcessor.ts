import {
  AlgoBlock,
  ChainType,
  IBlock,
  Managed,
  traceFunction,
  UtxoBlock,
  UtxoTransaction,
  XrpBlock,
  XrpTransaction,
  XRP_UTD,
  IFullBlock,
  XrpFullBlock,
  UtxoFullBlock,
} from "@flarenetwork/mcc";
import { LimitingProcessor } from "../../caching/LimitingProcessor";
import { DBBlockALGO, DBBlockDOGE, DBBlockXRP } from "../../entity/indexer/dbBlock";
import { DBTransactionBase, DBTransactionDOGE0 } from "../../entity/indexer/dbTransaction";
import { retryMany } from "../../utils/helpers/promiseTimeout";

import { criticalAsync, prepareIndexerTables } from "../indexer-utils";
import { augmentBlock } from "./augmentBlock";
import { augmentTransactionAlgo, augmentTransactionUtxo, augmentTransactionXrp } from "./augmentTransaction";
import { getFullTransactionUtxo } from "./readTransaction";
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

/**
 * Block processor for UTXO chains. It is used for LTC and Bitcon.
 * It is a specialized implementation of `LimitingProcessor`.
 * The block class (IBlock) is expected to have all transactions in
 * `tx` field.
 */
@Managed()
export class UtxoBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: IFullBlock, onSave: onSaveSig) {
    this.block = block as UtxoFullBlock<UtxoTransaction>;
    const txPromises = block.data.tx.map((txObject) => {
      const getTxObject = {
        blockhash: block.stdBlockHash,
        time: block.unixTimestamp,
        confirmations: 1, // This is the block itself as confirmation
        blocktime: block.unixTimestamp,
        ...txObject,
      };
      const processed = new UtxoTransaction(getTxObject);
      return this.call(() => traceFunction(() => getFullTransactionUtxo(this.client, processed, this)) as Promise<UtxoTransaction>);
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
 * Block processor for DOGE chain.
 * It is a specialized implementation of `LimitingProcessor`.
 * DOGE API does not contain all transactions in `tx` field so
 * additional reading of transactions from block is needed.
 */
@Managed()
export class DogeBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: IFullBlock, onSave: onSaveSig) {
    this.registerTopLevelJob();
    this.block = block as UtxoFullBlock<UtxoTransaction>;

    // DOGE API does not support returning the list of transactions with block request
    const preprocesedTxPromises = block.stdTransactionIds.map((txid: string) => {
      // the in-transactions are prepended to queue in order to process them earlier
      return () => this.call(() => this.client.getTransaction(txid), true) as Promise<UtxoTransaction>;
    });

    const awaitedTxIds = (await retryMany(
      `DogeBlockProcessor::preprocess all transactions`,
      preprocesedTxPromises,
      this.settings.timeout,
      this.settings.retry
    )) as UtxoTransaction[];

    const txPromises = awaitedTxIds.map((processed) => {
      return this.call(() => getFullTransactionUtxo(this.client, processed, this)) as Promise<UtxoTransaction>;
    });

    const transDbPromisses = txPromises.map((processed) => async () => {
      return await augmentTransactionUtxo(DBTransactionDOGE0, ChainType.DOGE, block, processed);
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

    const blockDb = augmentBlock(DBBlockDOGE, block);

    this.stop();

    // eslint-disable-next-line
    criticalAsync(`DogeBlockProcessor::initializeJobs(${block.number}) onSave exception: `, () => onSave(blockDb, transDb));
  }
}
/**
 * Block processor for ALGO chain.
 * It is a specialized implementation of `LimitingProcessor`.
 */
@Managed()
export class AlgoBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: IFullBlock, onSave: onSaveSig) {
    this.block = block as AlgoBlock;

    const txPromises = (block as AlgoBlock).transactions.map((algoTrans) => {
      return () => {
        return augmentTransactionAlgo(block as AlgoBlock, algoTrans);
      };
    });
    const transDb = (await retryMany(
      `AlgoBlockProcessor::initializeJobs(${block.number})`,
      txPromises,
      this.settings.timeout,
      this.settings.retry
    )) as DBTransactionBase[];
    this.pause();
    const blockDb = augmentBlock(DBBlockALGO, block);

    // eslint-disable-next-line
    criticalAsync(`AlgoBlockProcessor::initializeJobs(${block.number}) onSave exception: `, () => onSave(blockDb, transDb));
  }
}

/**
 * Block processor for XRP chain.
 * It is a specialized implementation of `LimitingProcessor`.
 */
@Managed()
export class XrpBlockProcessor extends LimitingProcessor {
  async initializeJobs(block: IFullBlock, onSave: onSaveSig) {
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

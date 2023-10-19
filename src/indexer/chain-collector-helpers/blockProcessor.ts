import { BtcFullBlock, BtcTransaction, ChainType, Managed, XrpFullBlock } from "@flarenetwork/mcc";
import { LimitingProcessor } from "../../caching/LimitingProcessor";
import { DBBlockXRP } from "../../entity/indexer/dbBlock";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { retryMany } from "../../utils/helpers/promiseTimeout";

import { criticalAsync, prepareIndexerTables } from "../indexer-utils";
import { augmentBlock } from "./augmentBlock";
import { augmentTransactionUtxo, augmentTransactionXrp } from "./augmentTransaction";
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
      throw new Error("Use external indexing for doge");
    default:
      return null;
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

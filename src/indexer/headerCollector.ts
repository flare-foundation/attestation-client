import { BlockHeaderBase, BlockTipBase, Managed } from "@flarenetwork/mcc";
import { failureCallback, retry, retryMany } from "../utils/helpers/promiseTimeout";
import { sleepMs } from "../utils/helpers/utils";
import { AttLogger } from "../utils/logging/logger";
import { UnconfirmedBlockManager } from "./UnconfirmedBlockManager";
import { IndexerToClient } from "./indexerToClient";
import { IndexerToDB } from "./indexerToDB";

interface IHeaderCollectorSettings {
  blockCollectTimeMs: number;
  numberOfConfirmations: number;
  blockCollecting: "raw" | "rawUnforkable" | "tips" | "latestBlock";
}

/**
 * Manages the block header collection on a blockchain.
 */
@Managed()
export class HeaderCollector {
  private settings: IHeaderCollectorSettings;
  private indexerToClient: IndexerToClient;
  public indexerToDB: IndexerToDB;
  private logger: AttLogger;
  private IndexedHeight: number;
  private blockHeaderHash = new Set<string>();
  private blockHeaderNumber = new Set<number>();
  // Use this only on non-forkable chains
  private blockNumberHash = new Map<number, string[]>();

  constructor(logger: AttLogger, N: number, indexerToClient: IndexerToClient, indexerToDB: IndexerToDB, settings: IHeaderCollectorSettings) {
    this.logger = logger;
    this.IndexedHeight = N;
    this.indexerToClient = indexerToClient;
    this.indexerToDB = indexerToDB;
    this.settings = settings;
  }

  /////////////////////////////////////////////////////////////
  // update N
  /////////////////////////////////////////////////////////////

  /**
   * Updates N.
   * @param newN
   */
  public updateIndexedHeight(newN: number) {
    this.IndexedHeight = newN;
  }

  /**
   * Triggered when the bottom block number is updated.
   * @param newBottomBlockNumber
   */
  public onUpdateBottomBlockNumber(newBottomBlockNumber: number) {
    // this is non-awaited on purpose
    this.clearOlderBlocksInCache(newBottomBlockNumber);
  }

  /////////////////////////////////////////////////////////////
  // caching
  /////////////////////////////////////////////////////////////

  /**
   * Checks if the block is cached.
   * @param block
   * @returns
   */
  private isBlockCached(block: BlockTipBase) {
    return this.blockHeaderHash.has(block.stdBlockHash) && this.blockHeaderNumber.has(block.number);
  }

  /**
   * Cache the block.
   * @param block
   */
  private cacheBlock(block: BlockTipBase) {
    this.blockHeaderHash.add(block.stdBlockHash);
    this.blockHeaderNumber.add(block.number);
    let hashes = this.blockNumberHash.get(block.number) || [];
    hashes.push(block.stdBlockHash);
    this.blockNumberHash.set(block.number, hashes);
  }

  /**
   * Clears the cache of blocks with block numbers < blockNumber.
   * @param blockNumber
   * @returns
   */
  private async clearOlderBlocksInCache(blockNumber: number) {
    let currentBlockNumber = blockNumber - 1;
    while (currentBlockNumber >= 0) {
      const hashList = this.blockNumberHash.get(currentBlockNumber);
      if (!hashList || hashList.length === 0) {
        return; //this happens only if cache for currentBlockNumber has already been cleared or is before the start of indexing, therefore also for all blocks before
      }
      this.blockHeaderNumber.delete(currentBlockNumber);
      for (const hash of hashList) {
        this.blockHeaderHash.delete(hash);
      }
      this.blockNumberHash.delete(currentBlockNumber);
      currentBlockNumber--;
      await sleepMs(10); // yield the thread
    }
  }
  /////////////////////////////////////////////////////////////
  // saving blocks
  /////////////////////////////////////////////////////////////

  /**
   * Saves block headers in the range of block numbers. It is used on chains without
   * forks.
   * @param fromBlockNumber starting block number (included, should be greater than N on indexer)
   * @param toBlockNumberInc ending block number (included)
   */
  public async readAndSaveBlocksHeaders(fromBlockNumber: number, toBlockNumberInc: number) {
    // assert - this should never happen
    if (fromBlockNumber <= this.IndexedHeight) {
      const onFailure = failureCallback;
      onFailure("saveBlocksHeaders: fromBlock too low");
      return;
      // this should exit the program
    }
    const blockPromises = [];

    for (let blockNumber = fromBlockNumber; blockNumber <= toBlockNumberInc; blockNumber++) {
      // // if rawUnforkable then we can skip block numbers if they are already written
      // if (this.indexer.chainConfig.blockCollecting === "rawUnforkable") {
      //   if (this.blockHeaderNumber.has(blockNumber)) {
      //     continue;
      //   }
      // }
      blockPromises.push(async () => this.indexerToClient.getBlockHeaderFromClient(`saveBlocksHeaders`, blockNumber));
    }

    let blocks = (await retryMany(`saveBlocksHeaders`, blockPromises, 5000, 5)) as BlockHeaderBase[];
    blocks = blocks.filter((block) => !this.isBlockCached(block));
    await this.saveHeadersOnNewTips(blocks);
  }

  /**
   * Saves blocks or headers in the array, if block.number > N.
   * Block numbers <= N are ignored.
   * Note that for case of non-forkable chains it caches mapping
   * from block number to block (header). This mapping (`blockNumberHash`)
   * should not be used with forkable chains.
   *
   * NOTE: the function is not subject to race conditions with processing of
   * confirmed blocks since only blockNumber, blockHash and timestamp are updated
   * in the block table if an entry in dbBlock table already exists.
   * @param blocks array of headers
   * @returns
   */
  public async saveHeadersOnNewTips(blockTips: BlockTipBase[] | BlockHeaderBase[]) {
    let blocksText = "[";

    const unconfirmedBlockManager = new UnconfirmedBlockManager(this.indexerToDB.dbService, this.indexerToDB.dbBlockClass, this.IndexedHeight);
    await unconfirmedBlockManager.initialize();

    for (const blockTip of blockTips) {
      // due to the above async call N could increase
      if (!blockTip || !blockTip.stdBlockHash || blockTip.number <= this.IndexedHeight) {
        continue;
      }
      const blockNumber = blockTip.number;

      // check cache
      if (this.isBlockCached(blockTip)) {
        // cached
        blocksText += "^G" + blockNumber.toString() + "^^,";
        continue;
      } else {
        // new
        blocksText += blockNumber.toString() + ",";
      }

      this.cacheBlock(blockTip);

      const dbBlock = new this.indexerToDB.dbBlockClass();

      dbBlock.blockNumber = blockNumber;
      dbBlock.blockHash = blockTip.stdBlockHash;
      dbBlock.numberOfConfirmations = 1;
      dbBlock.timestamp = 0;

      if (blockTip instanceof BlockHeaderBase) {
        // if we got IBlockHeader we already have all the info required
        const header = blockTip as BlockHeaderBase;

        dbBlock.timestamp = header.unixTimestamp;
        dbBlock.previousBlockHash = header.previousBlockHash;
      } else {
        // On UTXO chains this means block is on main branch (some blocks may only have headers and not be in node's database)
        const activeBlock = blockTip.chainTipStatus === "active";

        // if block is not on disk (headers-only) we have to skip reading it
        if (activeBlock) {
          const actualBlock = await this.indexerToClient.getBlockHeaderFromClientByHash("saveHeadersOnNewTips", blockTip.blockHash);

          dbBlock.timestamp = actualBlock.unixTimestamp;
          dbBlock.previousBlockHash = actualBlock.previousBlockHash;
        }
      }

      // dbBlocks.push(dbBlock);
      unconfirmedBlockManager.addNewBlock(dbBlock);
    }

    let dbBlocks = unconfirmedBlockManager.getChangedBlocks();

    // remove all blockNumbers <= N. Note that N might have changed after the above
    // async query
    dbBlocks = dbBlocks.filter((dbBlock) => dbBlock.blockNumber > this.IndexedHeight);

    if (dbBlocks.length === 0) {
      //this.logger.debug(`write block headers (no new blocks)`);
      return;
    }

    this.logger.debug(`write block headers ${blocksText}]`);

    await retry(`saveBlocksHeadersArray`, async () => await this.indexerToDB.dbService.manager.save(dbBlocks));
  }

  /////////////////////////////////////////////////////////////
  // header collectors
  /////////////////////////////////////////////////////////////

  /**
   * For non-forkable chains we monitor and save chain height
   */
  async runBlockHeaderCollectingRaw() {
    let T = -1;
    while (true) {
      // get chain top block
      const newT = await this.indexerToClient.getBlockHeightFromClient(`runBlockHeaderCollectingRaw`);
      if (T != newT) {
        await this.indexerToDB.writeTipHeight(newT);
        T = newT;
      }
      await sleepMs(this.settings.blockCollectTimeMs);
    }
  }

  /**
   * Collects block headers on forkable (PoW/UTXO) chains and saves them into the database
   */
  async runBlockHeaderCollectingTips() {
    let T = -1;
    while (true) {
      // get chain top block
      const newT = await this.indexerToClient.getBlockHeightFromClient(`runBlockHeaderCollectingTips`);
      if (T != newT) {
        await this.indexerToDB.writeTipHeight(newT);
        T = newT;
      }

      const blocks: BlockTipBase[] = await this.indexerToClient.client.getTopLiteBlocks(this.settings.numberOfConfirmations);

      await this.saveHeadersOnNewTips(blocks);

      await sleepMs(this.settings.blockCollectTimeMs);
    }
  }

  async runBlockHeaderCollecting() {
    switch (this.settings.blockCollecting) {
      case "raw":
      case "latestBlock":
      case "rawUnforkable":
        await this.runBlockHeaderCollectingRaw();
        break;
      case "tips":
        await this.runBlockHeaderCollectingTips();
        break;
    }
  }
}

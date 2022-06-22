import { IBlock, Managed } from "@flarenetwork/mcc";
import { LiteBlock } from "@flarenetwork/mcc/dist/src/base-objects/blocks/LiteBlock";
import { AttLogger, logException } from "../utils/logger";
import { retry, retryMany } from "../utils/PromiseTimeout";
import { sleepms } from "../utils/utils";
import { Indexer } from "./indexer";

@Managed()
export class HeaderCollector {
  private indexer: Indexer;

  private logger: AttLogger;

  private blockHeaderHash = new Set<string>();
  private blockHeaderNumber = new Set<number>();
  private blockNumberHash = new Map<number, string>();

  constructor(logger: AttLogger, indexer: Indexer) {
    this.logger = logger;
    this.indexer = indexer;
  }

  /////////////////////////////////////////////////////////////
  // caching
  /////////////////////////////////////////////////////////////

  private isBlockCached(block: IBlock) {
    return this.blockHeaderHash.has(block.stdBlockHash) && this.blockHeaderNumber.has(block.number);
  }

  private cacheBlock(block: IBlock) {
    this.blockHeaderHash.add(block.stdBlockHash);
    this.blockHeaderNumber.add(block.number);
    this.blockNumberHash.set(block.number, block.stdBlockHash);
  }

  /////////////////////////////////////////////////////////////
  // saving blocks
  /////////////////////////////////////////////////////////////

  async saveLiteBlocksHeaders(blocks: LiteBlock[]) {
    try {
      await this.saveBlocksHeadersArray(blocks);
    } catch (error) {
      logException(error, `saveLiteBlocksHeaders error: }`);
    }
  }

  async saveBlocksHeaders(fromBlockNumber: number, toBlockNumberInc: number) {
    const blockPromisses = [];

    for (let blockNumber = fromBlockNumber; blockNumber <= toBlockNumberInc; blockNumber++) {
      // if rawUnforkable then we can skip block numbers if they are already written
      if (this.indexer.chainConfig.blockCollecting === "rawUnforkable") {
        if (this.blockHeaderNumber.has(blockNumber)) {
          continue;
        }
      }

      blockPromisses.push(async () => this.indexer.getBlock(`saveBlocksHeaders`, blockNumber));
    }

    const blocks = (await retryMany(`saveBlocksHeaders`, blockPromisses, 5000, 5)) as IBlock[];

    await this.saveBlocksHeadersArray(blocks);
  }

  async saveBlocksHeadersArray(blocks: IBlock[]) {
    let blocksText = "[";

    const dbBlocks = [];

    for (const block of blocks) {
      if (!block || !block.stdBlockHash) continue;

      const blockNumber = block.number;

      // check cache
      if (this.isBlockCached(block)) {
        // cached
        blocksText += "^G" + blockNumber.toString() + "^^,";
        continue;
      } else {
        // new
        blocksText += blockNumber.toString() + ",";
      }

      this.cacheBlock(block);

      const dbBlock = new this.indexer.dbBlockClass();

      dbBlock.blockNumber = blockNumber;
      dbBlock.blockHash = block.stdBlockHash;
      dbBlock.timestamp = block.unixTimestamp;

      dbBlocks.push(dbBlock);
    }

    // remove all blockNumbers <= N+1
    while (dbBlocks.length > 0 && dbBlocks[0].blockNumber <= this.indexer.N + 1) {
      dbBlocks.splice(0, 1);
    }

    if (dbBlocks.length === 0) {
      //this.logger.debug(`write block headers (no new blocks)`);
      return;
    }

    this.logger.debug(`write block headers ${blocksText}]`);

    retry(`saveBlocksHeadersArray`, async () => await this.indexer.dbService.manager.save(dbBlocks));
  }

  /////////////////////////////////////////////////////////////
  // save state
  /////////////////////////////////////////////////////////////

  async writeT(T: number) {
    // every update save last T
    const stateTcheckTime = this.indexer.getStateEntry("T", T);

    retry(`writeT`, async () => await this.indexer.dbService.manager.save(stateTcheckTime));
  }

  /////////////////////////////////////////////////////////////
  // header collectors
  /////////////////////////////////////////////////////////////

  async runBlockHeaderCollectingRaw() {
    let localN = this.indexer.N;
    let localBlockNp1hash = "";

    // add initial number
    this.blockHeaderNumber.add(localN);

    while (true) {
      // get chain top block
      const localT = await this.indexer.getBlockHeight(`runBlockHeaderCollectingRaw`);
      const blockNp1 = (await this.indexer.getBlock(`runBlockHeaderCollectingRaw1`, localN + 1)) as IBlock;

      // has N+1 confirmation block
      const isNewBlock = localN < localT - this.indexer.chainConfig.numberOfConfirmations;
      const isChangedNp1Hash = localBlockNp1hash !== blockNp1.stdBlockHash;

      await this.writeT(localT);

      // check if N + 1 hash is the same
      if (!isNewBlock && !isChangedNp1Hash) {
        await sleepms(this.indexer.config.blockCollectTimeMs);
        continue;
      }

      // save block headers N+1 ... T
      await this.saveBlocksHeaders(localN + 1, localT);

      while (localN < localT - this.indexer.chainConfig.numberOfConfirmations) {
        if (this.blockHeaderNumber.has(localN)) {
          this.logger.debug2(`runBlockCollector N=${localN}++`);

          localN++;
          await sleepms(100);
          continue;
        }
        break;
      }

      this.logger.debug1(`runBlockCollector final N=${localN}`);

      localBlockNp1hash = this.blockNumberHash.get(localN);
    }
  }

  async runBlockHeaderCollectingTips() {
    let localN = this.indexer.N;
    let localBlockNp1hash = "";

    while (true) {
      // get chain top block
      const localT = await this.indexer.getBlockHeight(`runBlockHeaderCollectingRaw`);

      await this.writeT(localT);

      const blocks: LiteBlock[] = await this.indexer.cachedClient.client.getTopLiteBlocks(this.indexer.chainConfig.numberOfConfirmations);

      await this.saveLiteBlocksHeaders(blocks);

      await sleepms(100);
    }
  }

  async runBlockHeaderCollecting() {
    switch (this.indexer.chainConfig.blockCollecting) {
      case "raw":
      case "latestBlock":
      case "rawUnforkable":
        this.runBlockHeaderCollectingRaw();
        break;
      case "tips":
        this.runBlockHeaderCollectingTips();
        break;
    }
  }
}

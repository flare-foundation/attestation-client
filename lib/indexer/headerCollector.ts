import { BlockBase, IBlock } from "flare-mcc";
import { LiteBlock } from "flare-mcc/dist/base-objects/LiteBlock";
import { AttLogger } from "../utils/logger";
import { PromiseTimeout } from "../utils/PromiseTimeout";
import { sleep } from "../utils/utils";
import { Indexer } from "./indexer";


export class HeaderCollector {

    private indexer: Indexer;

    private logger: AttLogger;


    private blockHeaderHash = new Set<string>();
    private blockHeaderNumber = new Set<number>();

    constructor(logger: AttLogger, indexer: Indexer) {
        this.logger = logger;
        this.indexer = indexer;
    }

    private isBlockCached(block: LiteBlock | IBlock) {
        return this.blockHeaderHash.has(block.hash) && this.blockHeaderNumber.has(block.number);
    }

    private cacheBlock(block: LiteBlock | IBlock) {
        this.blockHeaderHash.add(block.hash);
        this.blockHeaderNumber.add(block.number);
    }
    private getBlock(blockNumber: number): Promise<IBlock> {
        // todo: implement lite version
        return this.indexer.cachedClient.client.getBlock(blockNumber);
    }

    private getBlockHeight(): Promise<number> {
        return this.indexer.cachedClient.client.getBlockHeight();
    }

    async runBlockHeaderCollectingTips() {
        let localN = this.indexer.N;
        let localBlockNp1hash = "";

        while (true) {
            try {
                const blocks: LiteBlock[] = await this.indexer.cachedClient.client.getTopLiteBlocks(this.indexer.chainConfig.confirmationsCollect);

                await this.saveLiteBlocksHeaders(blocks);

            } catch (error) {
                this.logger.error2(`runBlockHeaderCollectingTips: ${error}`);
                this.logger.error(error.stack);
            }
        }
    }

    async runBlockHeaderCollectingRaw() {
        let localN = this.indexer.N;
        let localBlockNp1hash = "";

        while (true) {
            try {
                // get chain top block
                const localT = await this.getBlockHeight();
                const blockNp1 = (await this.getBlock(localN + 1)) as IBlock;

                // has N+1 confirmation block
                const isNewBlock = localN < localT - this.indexer.chainConfig.confirmationsCollect;
                const isChangedNp1Hash = localBlockNp1hash !== blockNp1.hash;

                // check if N + 1 hash is the same
                if (!isNewBlock && !isChangedNp1Hash) {
                    await sleep(this.indexer.config.blockCollectTimeMs);
                    continue;
                }

                // save block headers N+1 ... T
                await this.saveBlocksHeaders(localN + 1, localT);

                if (isNewBlock) {
                    localN++;
                }

                // save block N+1 hash
                localBlockNp1hash = blockNp1.hash;

                while (localN < localT - this.indexer.chainConfig.confirmationsCollect) {
                    if (this.blockHeaderNumber.has(localN)) {
                        localN++;
                    }
                }
            } catch (error) {
                this.logger.error2(`runBlockHeaderCollectingRaw exception: ${error}`);
                this.logger.error(error.stack);

            }
        }
    }

    async saveLiteBlocksHeaders(blocks: LiteBlock[]) {
        try {
            const outBlocks = blocks.map(block => new LiteIBlock(block));

            await this.saveBlocksHeadersArray(outBlocks);

        } catch (error) {
            this.logger.error2(`saveLiteBlocksHeaders error: ${error}`);
            this.logger.error(error.stack);
        }
    }


    async saveBlocksHeaders(fromBlockNumber: number, toBlockNumberInc: number) {
        try {
            const blockPromisses = [];

            for (let blockNumber = fromBlockNumber; blockNumber <= toBlockNumberInc; blockNumber++) {
                // if rawUnforkable then we can skip block numbers if they are already written
                if (this.indexer.chainConfig.blockCollecting === "rawUnforkable") {
                    if (this.blockHeaderNumber.has(blockNumber)) {
                        continue;
                    }
                }

                blockPromisses.push(async () => this.getBlock(blockNumber));
            }

            const blocks = await PromiseTimeout.allRetry(blockPromisses, 5000, 5);

            await this.saveBlocksHeadersArray(blocks);

        } catch (error) {
            this.logger.error2(`saveBlocksHeaders error: ${error}`);
            this.logger.error(error.stack);
        }
    }

    async saveBlocksHeadersArray(blocks: IBlock[]) {
        try {
            let blocksText = "[";

            const dbBlocks = [];

            for (const block of blocks) {
                if (!block || !block.hash) continue;

                const blockNumber = block.number;

                // check cache
                if (this.isBlockCached(block)) {
                    // cached
                    blocksText += "^G" + blockNumber.toString() + "^^,";
                    continue;
                }
                else {
                    // new
                    blocksText += blockNumber.toString() + ",";
                }

                this.cacheBlock(block);

                const dbBlock = new this.indexer.dbBlockClass();

                dbBlock.blockNumber = blockNumber;
                dbBlock.blockHash = block.hash;
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

            await this.indexer.dbService.manager.save(dbBlocks);

            // await this.dbService.manager
            //   .createQueryBuilder()
            //   .update(DBBlock)
            //   .set({ confirmed: true })
            //   .where("blockNumber < :blockNumber", { blockNumber: blockNumber - this.chainConfig.confirmationsIndex })
            //   .execute();
        } catch (error) {
            this.logger.error2(`saveBlocksHeadersArray error: ${error}`);
            this.logger.error(error.stack);
        }
    }

    async runBlockHeaderCollecting() {
        switch (this.indexer.chainConfig.blockCollecting) {
            case "raw":
            case "rawUnforkable": this.runBlockHeaderCollectingRaw(); break;
            case "tips": this.runBlockHeaderCollectingTips(); break;
        }
    }
}



class LiteIBlock extends BlockBase<LiteBlock> {
    public get number(): number {
        return this.data.number;
    }

    public get hash(): string {
        return this.data.hash;
    }

    public get unixTimestamp(): number {
        return 0;
    }

    public get transactionHashes(): string[] {
        throw new Error("unimplemented");
    }

    public get transactionCount(): number {
        throw new Error("unimplemented");
    }
}

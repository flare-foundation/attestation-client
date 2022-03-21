import { BlockBase, IBlock } from "flare-mcc";
import { LiteBlock } from "flare-mcc/dist/base-objects/LiteBlock";
import { AttLogger, logException } from "../utils/logger";
import { retry, retryMany } from "../utils/PromiseTimeout";
import { sleepms } from "../utils/utils";
import { Indexer } from "./indexer";


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

    private isBlockCached(block: LiteBlock | IBlock) {
        return this.blockHeaderHash.has(block.hash) && this.blockHeaderNumber.has(block.number);
    }

    private cacheBlock(block: LiteBlock | IBlock) {
        this.blockHeaderHash.add(block.hash);
        this.blockHeaderNumber.add(block.number);
        this.blockNumberHash.set(block.number, block.hash);
    }
    async getBlock(label: string, blockNumber: number): Promise<IBlock> {
        // todo: implement lite version
        return await retry(`headerCollector.getBlock.${label}`, async () => { return await this.indexer.cachedClient.client.getBlock(blockNumber); });
    }

    async getBlockHeight(label: string): Promise<number> {
        return await retry(`headerCollector.getBlockHeight.${label}`, async () => { return this.indexer.cachedClient.client.getBlockHeight(); });
    }

    async runBlockHeaderCollectingTips() {
        let localN = this.indexer.N;
        let localBlockNp1hash = "";

        while (true) {
            try {
                const blocks: LiteBlock[] = await this.indexer.cachedClient.client.getTopLiteBlocks(this.indexer.chainConfig.confirmationBlocks);

                await this.saveLiteBlocksHeaders(blocks);

            } catch (error) {
                logException(error, `runBlockHeaderCollectingTips: `);
            }
        }
    }

    async saveLiteBlocksHeaders(blocks: LiteBlock[]) {
        try {
            const outBlocks = blocks.map(block => new LiteIBlock(block));

            await this.saveBlocksHeadersArray(outBlocks);

        } catch (error) {
            logException(error, `saveLiteBlocksHeaders error: }`);
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

                blockPromisses.push(async () => this.getBlock(`saveBlocksHeaders`, blockNumber));
            }

            const blocks = await retryMany(`saveBlocksHeaders`, blockPromisses, 5000, 5) as IBlock[];

            await this.saveBlocksHeadersArray(blocks);

        } catch (error) {
            logException(error, `saveBlocksHeaders error: `);
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
            logException(error, `saveBlocksHeadersArray error: `);
        }
    }

    async runBlockHeaderCollectingRaw() {
        let localN = this.indexer.N;
        let localBlockNp1hash = "";

        // add initial number
        this.blockHeaderNumber.add(localN);

        while (true) {
            try {
                // get chain top block
                const localT = await this.getBlockHeight(`runBlockHeaderCollectingRaw`);
                const blockNp1 = (await this.getBlock(`runBlockHeaderCollectingRaw1`, localN + 1)) as IBlock;

                // has N+1 confirmation block
                const isNewBlock = localN < localT - this.indexer.chainConfig.confirmationBlocks;
                const isChangedNp1Hash = localBlockNp1hash !== blockNp1.hash;

                // every update save last T
                try {
                    const stateTcheckTime = this.indexer.getStateEntry("T", localT);

                    await this.indexer.dbService.manager.save(stateTcheckTime);

                } catch (error) {
                    logException(error, `runBlockHeaderCollectingRaw database error (T=${localT}):`);
                    return false;
                }

                // check if N + 1 hash is the same
                if (!isNewBlock && !isChangedNp1Hash) {


                    await sleepms(this.indexer.config.blockCollectTimeMs);
                    continue;
                }

                // save block headers N+1 ... T
                await this.saveBlocksHeaders(localN + 1, localT);

                while (localN < localT - this.indexer.chainConfig.confirmationBlocks) {
                    if (this.blockHeaderNumber.has(localN)) {
                        this.logger.debug2(`runBlockCollector N=${localN}++`);

                        localN++;
                        await sleepms(100);
                        continue;
                    }
                    break;
                }

                this.logger.debug1(`runBlockCollector final N=${localN}`);

                // todo: optimize to use hash from cache
                // save block N+1 hash
                //const newBlockNp1 = (await this.getBlock(`runBlockHeaderCollectingRaw2`, localN + 1)) as IBlock;
                //localBlockNp1hash = newBlockNp1.hash;
                localBlockNp1hash = this.blockNumberHash.get(localN);

            } catch (error) {
                logException(error, `runBlockHeaderCollectingRaw exception: `);
            }
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

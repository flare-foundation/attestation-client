import { IBlock, Managed } from "@flarenetwork/mcc";
import { CachedMccClient } from "../caching/CachedMccClient";
import { LimitingProcessor } from "../caching/LimitingProcessor";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { retry } from "../utils/PromiseTimeout";
import { BlockProcessor } from "./chain-collector-helpers/blockProcessor";
import { Indexer } from "./indexer";

@Managed()
export class BlockProcessorManager {

    indexer: Indexer;

    logger: AttLogger;

    blockProcessors: LimitingProcessor[] = [];

    cachedClient: CachedMccClient<any, any>;

    completeCallback: any;
    alreadyCompleteCallback: any;

    blockCache = new Map<number, IBlock>();
    blockHashCache = new Map<string, IBlock>();


    constructor(indexer: Indexer, logger: AttLogger, client: CachedMccClient<any, any>, completeCallback: any, alreadyCompleteCallback: any) {
        this.indexer = indexer;
        this.logger = logger;
        this.cachedClient = client;
        this.completeCallback = completeCallback;
        this.alreadyCompleteCallback = alreadyCompleteCallback;
    }

    // todo: write this method decorator
    // @terminateAppOnException()
    async processSyncBlockNumber(blockNumber: number) {
        try {
            const cachedBlock = await this.blockCache.get(blockNumber);

            if (cachedBlock) return;

            const block = await retry(`BlockProcessorManager.getBlock.processSyncBlockNumber`, async () => { return await this.cachedClient.getBlock(blockNumber); });

            if (!block) return;

            this.blockCache.set(blockNumber, block);

            this.process(block, true);
        } catch (error) {
            logException(error, `BlockProcessorManager::processSyncBlockNumber exception: `);

            getGlobalLogger().error2(`application exit`);
            process.exit(2);
        }
    }

    async processSyncBlockHash(blockHash: string) {
        try {
            const cachedBlock = await this.blockHashCache.get(blockHash);

            if (cachedBlock) return;

            const block = await retry(`BlockProcessorManager.getBlock.processSyncBlockHash`, async () => { return await this.cachedClient.getBlock(blockHash); });

            if (!block) return;

            this.blockHashCache.set(blockHash, block);

            this.process(block, true);
        } catch (error) {
            logException(error, `BlockProcessorManager::processSyncBlockHash exception: `);

            getGlobalLogger().error2(`application exit`);
            process.exit(2);
        }
    }

    async process(block: IBlock, syncMode = false) {
        try {
            let started = false;
            for (let a = 0; a < this.blockProcessors.length; a++) {
                if (this.blockProcessors[a].block.stdBlockHash === block.stdBlockHash) {
                    started = true;

                    if (syncMode) return;

                    if (this.blockProcessors[a].isCompleted) {
                        this.logger.info(`^w^Kprocess block ${block.number}^^^W (completed)`)

                        this.alreadyCompleteCallback(block);

                        return;
                    }

                    this.logger.info(`^w^Kprocess block ${block.number}^^^W (continue)`)
                    this.blockProcessors[a].continue();
                }
                else {
                    if (!syncMode) {
                        this.blockProcessors[a].pause();
                    }
                }
            }

            if (started) return;

            this.logger.info(`^w^Kprocess block ${block.number}`)

            const processor = new (BlockProcessor(this.cachedClient.chainType))(this.indexer);
            this.blockProcessors.push(processor);

            //processor.debugOn( block.hash );

            // terminate app on exception
            // @ts-ignore
            processor.initializeJobs(block, this.completeCallback);

        } catch (error) {
            logException(error, `BlockProcessorManager::process exception: `);

            getGlobalLogger().error2(`application exit`);
            process.exit(2);
        }
    }

    clear(fromBlock: number) {
        // delete all that are block number <= completed block number
        for (let a = 0; a < this.blockProcessors.length; a++) {
            if (this.blockProcessors[a].block.number <= fromBlock) {
                this.blockProcessors[a].destroy();

                this.blockProcessors.splice(a--, 1);
            }
        }
    }
}
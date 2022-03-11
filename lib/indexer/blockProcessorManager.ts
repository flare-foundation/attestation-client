import { IBlock } from "flare-mcc";
import { CachedMccClient } from "../caching/CachedMccClient";
import { LimitingProcessor } from "../caching/LimitingProcessor";
import { AttLogger } from "../utils/logger";
import { BlockProcessor } from "./chain-collector-helpers/blockProcessor";

export class BlockProcessorManager {

    logger: AttLogger;

    blockProcessors: LimitingProcessor[] = [];

    cachedClient: CachedMccClient<any,any>;

    completeCallback: any;
    alreadyCompleteCallback: any;

    blockCache = new Map<number,IBlock>();


    constructor(logger: AttLogger, client: CachedMccClient<any,any>, completeCallback: any, alreadyCompleteCallback: any) {
        this.logger=logger;
        this.cachedClient = client;
        this.completeCallback = completeCallback;
        this.alreadyCompleteCallback = alreadyCompleteCallback;
    }

    async processSyncBlockNumber(blockNumber: number) {
        const cachedBlock = this.blockCache.get(blockNumber);

        if( cachedBlock ) return;

        const block = await this.cachedClient.getBlock(blockNumber);

        if( !block ) return;

        this.blockCache.set( blockNumber, block );

        this.process( block , true );
    }

    async process(block: IBlock, syncMode=false) {

        let started = false;
        for (let a = 0; a < this.blockProcessors.length; a++) {
            if (this.blockProcessors[a].block.hash === block.hash) {
                started = true;

                if( syncMode ) return;

                if( this.blockProcessors[a].isCompleted ) {
                    this.logger.info( `^w^Kprocess ${block.number}^^^W (completed)`)

                    this.alreadyCompleteCallback( block );

                    return;
                }

                this.logger.info( `^w^Kprocess ${block.number}^^^W (continue)`)
                this.blockProcessors[a].continue();
            }
            else {
                if( !syncMode ) {
                    this.blockProcessors[a].pause();
                }
            }
        }

        if (started) return;

        this.logger.info( `^w^Kprocess ${block.number}`)

        const processor = new (BlockProcessor( this.cachedClient.chainType ))( this.cachedClient );
        this.blockProcessors.push(processor);

        //processor.debugOn( block.hash );
        
        processor.initializeJobs(block,this.completeCallback);
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
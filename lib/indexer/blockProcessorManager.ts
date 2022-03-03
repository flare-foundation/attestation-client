import { IBlock } from "flare-mcc";
import { CachedMccClient } from "../caching/CachedMccClient";
import { LimitingProcessor } from "../caching/LimitingProcessor";
import { BlockProcessor } from "./chain-collector-helpers/blockProcessor";

export class BlockProcessorManager {

    blockProcessors: LimitingProcessor[] = [];

    cachedClient: CachedMccClient<any,any>;

    completeCallback: any;

    constructor(client: CachedMccClient<any,any>, completeCallback: any) {
        this.cachedClient = client;
        this.completeCallback = completeCallback;
    }

    async process(block: IBlock) {
        let started = false;
        for (let a = 0; a < this.blockProcessors.length; a++) {
            if (this.blockProcessors[a].block.hash === block.hash) {
                started = true;
                this.blockProcessors[a].continue();
            }
            else {
                this.blockProcessors[a].pause();
            }
        }

        if (started) return;

        const processor = new (BlockProcessor( this.cachedClient.chainType ))( this.cachedClient );
        this.blockProcessors.push(processor);

        processor.debugOn( block.hash );
        processor.initializeJobs(block,this.completeCallback);
    }
    
    clear(fromBlock: number) {
        // delete all that are block number <= completed block number
        for (let a = 0; a < this.blockProcessors.length; a++) {
            if (this.blockProcessors[a].block.number <= fromBlock) {
                this.blockProcessors[a].destroy();
                this.blockProcessors = this.blockProcessors.splice(a--, 1);
            }
        }
    }
}
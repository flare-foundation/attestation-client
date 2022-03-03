import { IBlock, RPCInterface } from "flare-mcc";
import { BlockProcessor } from "./blockProcessor";

export class BlockProcessorManager {

    blockProcessors: BlockProcessor[] = [];

    client: RPCInterface;

    completeCallback: any;

    constructor(client: RPCInterface, completeCallback: any) {
        this.client = client;
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

        const processor = new BlockProcessor(this, block);
        this.blockProcessors.push(processor);
        processor.start();
    }

    async complete(completedBlock: BlockProcessor) {
        await this.completeCallback(completedBlock);
    }

    clear(fromBlock: number) {
        // delete all that are block number <= completed block number
        for (let a = 0; a < this.blockProcessors.length; a++) {
            if (this.blockProcessors[a].block.number <= fromBlock) {
                this.blockProcessors = this.blockProcessors.splice(a--, 1);
            }
        }
    }
}
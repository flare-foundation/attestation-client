import { RPCInterface } from "flare-mcc";

export class BlockProcessorManager {

    blockProcessors: BlockProcessor[] = [];

    async processBlock(client: RPCInterface, block: any, callback: any) {
        let started = false;
        for (let a = 0; a < this.blockProcessors.length; a++) {
            if (this.blockProcessors[a].hash === block.hash) {
                started = true;
                this.blockProcessors[a].start();
            }
            else {
                this.blockProcessors[a].stop();
            }
        }

        if (started) return;

        const processor = new BlockProcessor(block);
        this.blockProcessors.push(processor);
        processor.start();
    }
    async advance(blockNumberCompleted: number) {

        // all <= N should be deleted

    }
}

class BlockProcessor {
    active = false;
    transactions: string[];
    activeTransaction = 0;

    hash: string;

    constructor(block: any) {
        // get block
        // get all transactions
        this.hash = block.hash;
        this.transactions = block
    }
    async start() {
        this.active = true;
        while (this.activeTransaction < this.transactions.length && this.active) {
            if (!this.active) return;

            await this.process(this.activeTransaction);

            this.activeTransaction++;
        }


    }

    stop() {
        this.active = false;
    }

    async process(transactionIndex: number) {

    }

}
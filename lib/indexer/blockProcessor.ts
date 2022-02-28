import { IBlock } from "flare-mcc";
import { DBBlock } from "../entity/dbBlock";
import { DBTransactionBase } from "../entity/dbTransaction";
import { sleepms } from "../utils/utils";
import { BlockProcessorManager } from "./blockProcessorManager";

export class BlockProcessor {
    active = false;
    completed = false;
    activeTransaction = 0;
    transactionCount = 0;

    blockProcessorManager: BlockProcessorManager;

    block: IBlock;
    completedBlock!: DBBlock;
    completedTransactions!: DBTransactionBase[];

    constructor(blockProcessorManager: BlockProcessorManager, block: IBlock) {
        this.block = block;

        this.blockProcessorManager = blockProcessorManager;
        this.transactionCount = block.transactionCount;
    }

    async start() {
        await this.preProcessBlock();
        this.continue();
    }


    async continue() {
        if (this.active) return;

        this.active = true;

        while (this.activeTransaction < this.transactionCount) {
            if (!this.active) return;

            if (! await this.processTransaction(this.activeTransaction)) {
                await sleepms(1);
                this.continue;
            }

            this.activeTransaction++;
        }

        await this.processBlock();

        this.active = false;
        this.completed = true;

        await this.blockProcessorManager.complete(this);
    }

    stop() {
        this.active = false;
    }

    async preProcessBlock() {
        // todo: @Luka process block (create completedBlock DBBlock)
    }

    async processBlock() {
        // todo: @Luka process block (create completedBlock DBBlock)
    }


    async processTransaction(transactionIndex: number): Promise<boolean> {
        // todo: @Luka process transaction (create completedTransactions[] DBTransactionBase[])

        // // axios full - wait
        // if (full) {
        //     return false;
        // }

        // // async without wait
        // readTransactionAlgo(80);

        return false;
    }

}
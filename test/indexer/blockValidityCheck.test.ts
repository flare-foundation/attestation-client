// yarn test test/indexer/act-2.test.ts

import { BlockBase, ChainType, IBlock, IXrpGetBlockRes, MCC, traceManager, XrpMccCreate } from "@flarenetwork/mcc";
import { XRPImplementation } from "@flarenetwork/mcc/dist/src/chain-clients/XrpRpcImplementation";
import { CachedMccClient, CachedMccClientOptions } from "../../lib/caching/CachedMccClient";
import { ChainConfiguration } from "../../lib/chain/ChainConfiguration";
import { BlockProcessorManager } from "../../lib/indexer/blockProcessorManager";
import { Indexer } from "../../lib/indexer/indexer";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { TestLogger } from "../../lib/utils/testLogger";

const chai = require('chai')
const expect = chai.expect

const XRPMccConnection = {
    url: "https://xrplcluster.com",
};



class MockXRPImplementation extends XRPImplementation {

    async getBlock(blockNumberOrHash: number | string): Promise<MockXrpBlock> {
        let block = await super.getBlock(blockNumberOrHash);

        return new MockXrpBlock(block);
    }

}

class MockXrpBlock extends BlockBase<IXrpGetBlockRes> {

    private block: IBlock;

    public constructor(block: IBlock) {
        super(block.data);
        this.block = block;
    }


    public get number(): number {
        return this.block.number;
    }

    public get blockHash(): string {
        return this.block.blockHash;
    }

    public get stdBlockHash(): string {
        return this.block.stdBlockHash;
    }

    public get unixTimestamp(): number {
        return this.block.unixTimestamp;
    }

    public get transactionIds(): string[] {
        return this.block.transactionIds;
    }

    public get stdTransactionIds(): string[] {
        return this.block.stdTransactionIds;
    }

    public get transactionCount(): number {
        return this.block.transactionCount;
    }

    public get isValid(): boolean {
        return false;
    }
}



describe("Block validity check before processing", () => {
    let XrpMccClient: MCC.XRP;
    let indexer: Indexer;

    before(async function () {
        initializeTestGlobalLogger();

        traceManager.displayStateOnException = false;
    });

    beforeEach(async function () {
        TestLogger.clear();

        indexer = new Indexer(null, null, null, null);

        XrpMccClient = new MCC.XRP(XRPMccConnection);

        let defaultCachedMccClientOptions: CachedMccClientOptions = {
            transactionCacheSize: 100000,
            blockCacheSize: 100000,
            cleanupChunkSize: 100,
            activeLimit: 70,
            clientConfig: XRPMccConnection,
        };

        const cachedClient = new CachedMccClient(ChainType.XRP, defaultCachedMccClientOptions);

        cachedClient.client = new MockXRPImplementation(defaultCachedMccClientOptions.clientConfig as XrpMccCreate);

        indexer.logger = getGlobalLogger();
        indexer.cachedClient = cachedClient as any;
        indexer.chainConfig = new ChainConfiguration();

        indexer.chainConfig.name = "XRP";

        indexer.prepareTables();

        indexer.blockProcessorManager = new BlockProcessorManager(
            indexer,
            indexer.logger,
            indexer.cachedClient,
            indexer.blockCompleted.bind(indexer),
            indexer.blockAlreadyCompleted.bind(indexer)
        );
    });

    it(`Block processor manager for valid XRP block`, async function () {
        const block = await XrpMccClient.getBlock(70_015_100);

        //block.data.result.validated = false;

        indexer.chainConfig.validateBlockBeforeProcess = true;

        await indexer.blockProcessorManager.process(block);

        expect(TestLogger.exists("waiting on block 70015100 to be valid"), "block should be valid at start").to.eq(false);
    });

    it(`Block processor manager for in-valid XRP block`, async function () {
        const block = await XrpMccClient.getBlock(70_015_100);

        block.data.result.validated = false;

        indexer.chainConfig.validateBlockBeforeProcess = true;

        await indexer.blockProcessorManager.process(block);

        expect(TestLogger.exists("waiting on block 70015100 to be valid"), "block should be invalid at start").to.eq(true);
        expect(TestLogger.exists("block 70015100 is now valid"), "block should become valid").to.eq(true);
    });

    it(`Block processor manager for in-valid XRP block when validation is not waited for`, async function () {
        const block = await XrpMccClient.getBlock(70_015_100);

        block.data.result.validated = false;

        indexer.chainConfig.validateBlockBeforeProcess = false;

        await indexer.blockProcessorManager.process(block);

        expect(TestLogger.exists("waiting on block 70015100 to be valid"), "invalid block should not be detected").to.eq(false);
    });

    it.only(`Block processor manager for always in-valid XRP block`, async function () {
        let XrpMccClient = new MockXRPImplementation(XRPMccConnection);

        const block = await XrpMccClient.getBlock(70_015_100);

        let invalidBlock = new MockXrpBlock(block);

        indexer.chainConfig.validateBlockBeforeProcess = true;

        TestLogger.setDisplay(1);

        await indexer.blockProcessorManager.process(invalidBlock);

        expect(TestLogger.exists("waiting on block 70015100 to be valid"), "block should be invalid at start").to.eq(true);
        expect(TestLogger.exists("block 70015100 is now valid"), "block should become valid").to.eq(true);
    });


});

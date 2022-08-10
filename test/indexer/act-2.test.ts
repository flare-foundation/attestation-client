// yarn test test/indexer/act-2.test.ts

import { ChainType, MCC, traceManager } from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptions } from "../../lib/caching/CachedMccClient";
import { ChainConfiguration } from "../../lib/chain/ChainConfiguration";
import { BlockProcessorManager } from "../../lib/indexer/blockProcessorManager";
import { Indexer } from "../../lib/indexer/indexer";
import { getGlobalLogger } from "../../lib/utils/logger";
import { TestLogger } from "../../lib/utils/testLogger";

const chai = require('chai')
const expect = chai.expect

const XRPMccConnection = {
    url: "https://xrplcluster.com",
};

describe("ACT-2", () => {
    let XrpMccClient: MCC.XRP;
    let indexer: Indexer;

    before(async function () {
        getGlobalLogger(null, true);
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

});

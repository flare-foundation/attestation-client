// yarn test test/indexer/blockValidityCheck.test-slow.ts

import { BlockBase, ChainType, FullBlockBase, IXrpGetBlockRes, MCC, XrpFullBlock, XrpTransaction, traceManager } from "@flarenetwork/mcc";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { ChainConfig } from "../../src/attester/configs/ChainConfig";
import { CachedMccClient, CachedMccClientOptions } from "../../src/caching/CachedMccClient";
import { BlockProcessorManager } from "../../src/indexer/blockProcessorManager";
import { Indexer } from "../../src/indexer/indexer";
import { setRetryFailureCallback } from "../../src/utils/helpers/promiseTimeout";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { TestLogger } from "../../src/utils/logging/testLogger";
import { getTestFile, TERMINATION_TOKEN } from "../test-utils/test-utils";
import { XRPImplementation } from "@flarenetwork/mcc/dist/src/chain-clients/XrpRpcImplementation";

chai.use(chaiAsPromised);

const XRPMccConnection = {
  url: "https://xrplcluster.com",
};

class MockXRPImplementation extends XRPImplementation {
  
  async getFullBlock(blockNumberOrHash: number | string): Promise<MockXrpBlock> {
    const block = await super.getFullBlock(blockNumberOrHash);

    return new MockXrpBlock(block);
  }
}

class MockXrpBlock extends XrpFullBlock {

  protected get data() {
    return this._data;
  }

  get transactions(): XrpTransaction[] {
    throw new Error("Method not implemented.");
  }
  get previousBlockHash(): string {
    throw new Error("Method not implemented.");
  }
  get stdPreviousBlockHash(): string {
    throw new Error("Method not implemented.");
  }

  private block: BlockBase;

  public constructor(block: BlockBase) {
    super(block._data);
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

describe(`Block validity check before processing , (${getTestFile(__filename)})`, () => {
  let XrpMccClient: MCC.XRP;
  let indexer: Indexer;

  before(async function () {
    initializeTestGlobalLogger();

    setRetryFailureCallback((label: string) => {
      throw new Error(TERMINATION_TOKEN);
    });

    traceManager.displayStateOnException = false;
  });

  beforeEach(async function () {
    TestLogger.clear();

    indexer = new Indexer(null, null, null);

    XrpMccClient = new MCC.XRP(XRPMccConnection);

    const defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: XRPMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.XRP, defaultCachedMccClientOptions);

    indexer.logger = getGlobalLogger();
    indexer.cachedClient = cachedClient as any;
    indexer.chainConfig = new ChainConfig();

    indexer.chainConfig.name = "XRP";

    indexer.prepareTables();

    indexer.blockProcessorManager = new BlockProcessorManager(
      indexer.logger,
      indexer.cachedClient,
      indexer.indexerToClient,
      indexer.interlace,
      {
        validateBlockBeforeProcess: indexer.chainConfig.validateBlockBeforeProcess,
        validateBlockMaxRetry: indexer.chainConfig.validateBlockMaxRetry,
        validateBlockWaitMs: indexer.chainConfig.validateBlockWaitMs,
      },
      indexer.blockCompleted.bind(indexer),
      indexer.blockAlreadyCompleted.bind(indexer)
    );
  });

  afterEach(function () {
    sinon.restore();
  });

  after(function () {
    setRetryFailureCallback((label) => {});
  });

  it(`Block processor manager for valid XRP block`, async function () {
    sinon.stub(console, "error");
    sinon.stub(console, "log");

    const block = await XrpMccClient.getFullBlock(70_015_100);

    //block.data.result.validated = false;

    indexer.chainConfig.validateBlockBeforeProcess = true;
    indexer.blockProcessorManager.settings.validateBlockBeforeProcess = true;

    await indexer.blockProcessorManager.process(block);

    expect(TestLogger.exists("waiting on block 70015100 to be valid"), "block should be valid at start").to.eq(false);
  });

  it(`Block processor manager for in-valid XRP block`, async function () {
    sinon.stub(console, "error");
    sinon.stub(console, "log");

    const block = await XrpMccClient.getFullBlock(70_015_100);

    block._data.result.validated = false;

    indexer.chainConfig.validateBlockBeforeProcess = true;
    indexer.blockProcessorManager.settings.validateBlockBeforeProcess = true;

    await indexer.blockProcessorManager.process(block);

    expect(TestLogger.exists("waiting on block 70015100 to be valid"), "block should be invalid at start").to.eq(true);
    expect(TestLogger.exists("block 70015100 is now valid"), "block should become valid").to.eq(true);
  });

  it(`Block processor manager for in-valid XRP block when validation is not waited for`, async function () {
    sinon.stub(console, "error");
    sinon.stub(console, "log");

    const block = await XrpMccClient.getFullBlock(70_015_100);

    block._data.result.validated = false;

    indexer.chainConfig.validateBlockBeforeProcess = false;
    indexer.blockProcessorManager.settings.validateBlockBeforeProcess = false;

    await indexer.blockProcessorManager.process(block);

    expect(TestLogger.exists("waiting on block 70015100 to be valid"), "invalid block should not be detected").to.eq(false);
  });

  //to be checked again
  it(`Block processor manager for always in-valid XRP block`, async function () {
    sinon.stub(console, "error");
    sinon.stub(console, "log");

    const XrpMccClient = new MockXRPImplementation(XRPMccConnection);

    indexer.logger = getGlobalLogger();
    indexer.cachedClient.client = XrpMccClient;

    const block = await XrpMccClient.getFullBlock(70_015_100);

    const invalidBlock = new MockXrpBlock(block);

    indexer.chainConfig.validateBlockBeforeProcess = true;
    indexer.chainConfig.validateBlockWaitMs = 1;
    indexer.blockProcessorManager.settings.validateBlockBeforeProcess = true;
    indexer.blockProcessorManager.settings.validateBlockWaitMs = 1;

    const fake = sinon.fake.throws("Error");

    // const stub1 = sinon.stub(getRetryFailureCallback()).rejects;
    await expect(indexer.blockProcessorManager.process(invalidBlock)).to.be.rejected;
  });
});

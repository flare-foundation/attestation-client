import { ChainType } from "@flarenetwork/mcc";
import { expect } from "chai";
import { CachedMccClient } from "../../lib/caching/CachedMccClient";
import { MockMccClient } from "../../lib/caching/test-utils/MockMccClient";
import { initializeTestGlobalLogger } from "../../lib/utils/logger";
import { sleepms } from "../../lib/utils/utils";
import { SourceId } from "../../lib/verification/sources/sources";
import { getTestFile, TERMINATION_TOKEN, testWithoutLoggingTracingAndApplicationTermination } from "../test-utils/test-utils";

const sinon = require("sinon");
const CHAIN_ID = SourceId.XRP;

describe(`Cached MCC Client test (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  let mockMccClient: MockMccClient;
  beforeEach(async () => {
    mockMccClient = new MockMccClient();
  });

  afterEach(function () {
    sinon.restore();
  });

  it("Should terminate application after several retries", async function () {
    const cachedMccClient = new CachedMccClient(CHAIN_ID as any as ChainType, { forcedClient: mockMccClient });

    const stub1 = sinon.stub(process, "exit").returns(null);
    await cachedMccClient.getTransaction("");
    expect(stub1.calledWith(2)).to.be.true;
  });
});

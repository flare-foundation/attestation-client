import { ChainType } from "@flarenetwork/mcc";
import { expect } from "chai";
import { CachedMccClient } from "../../src/caching/CachedMccClient";
import { MockMccClient } from "./test-utils/MockMccClient";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { sleepms } from "../../src/utils/helpers/utils";
import { SourceId } from "../../src/verification/sources/sources";
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

import { ChainType } from "@flarenetwork/mcc";
import chai, { expect } from "chai";
import chaiaspromised from "chai-as-promised";
import sinon from "sinon";
import { CachedMccClient } from "../../src/caching/CachedMccClient";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
import { MockMccClient } from "./test-utils/MockMccClient";
chai.use(chaiaspromised);
const CHAIN_ID = ChainType.XRP;

describe(`Cached MCC Client test (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  let mockMccClient: MockMccClient;
  beforeEach(async () => {
    mockMccClient = new MockMccClient();
    sinon.stub(console, "log");
    sinon.stub(console, "error");
  });

  afterEach(function () {
    sinon.restore();
  });

  it("Should terminate application after several retries", async function () {
    const cachedMccClient = new CachedMccClient(CHAIN_ID, { forcedClient: mockMccClient });

    const stub1 = sinon.stub(process, "exit");
    await cachedMccClient.getTransaction("");
    expect(stub1.calledWith(2)).to.be.true;
  });
});

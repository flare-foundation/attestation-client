import { ChainType } from "@flarenetwork/mcc";
import { CachedMccClient } from "../../lib/caching/CachedMccClient";
import { MockMccClient } from "../../lib/caching/test-utils/MockMccClient";
import { initializeTestGlobalLogger } from "../../lib/utils/logger";
import { SourceId } from "../../lib/verification/sources/sources";
import { getTestFile } from "../test-utils/test-utils";

import chai from "chai";
import sinon from "sinon";
import chaiaspromised from "chai-as-promised";
chai.use(chaiaspromised);
const expect = chai.expect;
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

    const stub1 = sinon.stub(process, "exit");
    await cachedMccClient.getTransaction("");
    expect(stub1.calledWith(2)).to.be.true;
  });
});

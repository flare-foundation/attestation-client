// yarn test test/attestationClient/sourceRouter.test.ts

import { assert, expect } from "chai";
import sinon from "sinon";
import { GlobalConfigManager } from "../../src/attester/GlobalConfigManager";
import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { SourceRouter } from "../../src/attester/source/SourceRouter";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";

describe(`SourceRouter (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  let sourceRouter: SourceRouter;

  before(async function () {
    const CONFIG_PATH_ATTESTER = "./test/attestationClient/test-data";
    process.env.TEST_CREDENTIALS = "1";
    process.env.SECURE_CONFIG_PATH = CONFIG_PATH_ATTESTER;

    const attestationClientConfig = await readSecureConfig(new AttestationClientConfig(), `attester_1`);
    const globalConfigManager = new GlobalConfigManager(attestationClientConfig, getGlobalLogger());
    globalConfigManager.activeRoundId = 160;
    await globalConfigManager.initialize();
    sourceRouter = new SourceRouter(globalConfigManager);
  });

  afterEach(function () {
    sinon.restore();
  });

  after(function () {
    delete process.env.TEST_CREDENTIALS;
    delete process.env.SECURE_CONFIG_PATH;
  });

  it("Should construct sourceRouter", function () {
    assert(sourceRouter);
  });

  it("Should initialize Source", function () {
    sourceRouter.initializeSourcesForRound(170);
    expect(sourceRouter.sourceManagers.size).to.eq(3); 
  });

  it("Should get SourceManager", function () {
    const res = sourceRouter.getSourceManager("XRP");
    expect(res.sourceId).to.eq("XRP");
  });

  it("Should not get SourceManager", function () {
    const stub = sinon.stub(process, "exit");
    const res = sourceRouter.getSourceManager("INVALID");
    assert(stub.calledOnce);
  });
});

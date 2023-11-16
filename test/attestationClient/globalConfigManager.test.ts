// yarn test test/attestationClient/globalConfigManager.test.ts

import { assert, expect } from "chai";
import { before } from "mocha";
import sinon from "sinon";
import { GlobalConfigManager } from "../../src/attester/GlobalConfigManager";
import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { readSecureConfig } from "../../src/utils/config/configSecure";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";

describe(`Global Config Manager (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  let globalConfigManager: GlobalConfigManager;
  let globalConfigManager2: GlobalConfigManager;

  before(async function () {
    const CONFIG_PATH_ATTESTER = "./test/attestationClient/test-data";
    process.env.TEST_CREDENTIALS = "1";
    process.env.SECURE_CONFIG_PATH = CONFIG_PATH_ATTESTER;

    const attestationClientConfig = await readSecureConfig(new AttestationClientConfig(), `attester_1`);
    globalConfigManager = new GlobalConfigManager(attestationClientConfig, getGlobalLogger());
    globalConfigManager.activeRoundId = 160;

    const attestationClientConfig2 = await readSecureConfig(new AttestationClientConfig(), `attester_2`);
    globalConfigManager2 = new GlobalConfigManager(attestationClientConfig2, getGlobalLogger());
    globalConfigManager2.activeRoundId = 5;
  });

  afterEach(function () {
    sinon.restore();
  });

  after(function () {
    delete process.env.TEST_CREDENTIALS;
    delete process.env.SECURE_CONFIG_PATH;
  });

  it("Should construct GlobalConfigManager", function () {
    assert(globalConfigManager);
  });

  it("Should initialize", async function () {
    await globalConfigManager.initialize();
    await globalConfigManager2.initialize();
    expect(globalConfigManager.globalAttestationConfigs.length).to.be.equal(2);
    expect(globalConfigManager2.globalAttestationConfigs.length).to.be.equal(2);
    expect(globalConfigManager.globalAttestationConfigs[0].startRoundId).to.eq(0);
  });

  it("Should get activeRoundId", function () {
    const rndId = globalConfigManager.activeRoundId;
    expect(rndId).to.eq(160);
  });

  it("Should get activeRoundId", function () {
    const rndId = globalConfigManager.activeRoundId;
    expect(rndId).to.eq(160);
  });

  it("Should get activeRoundId", function () {
    globalConfigManager.activeRoundId = undefined;

    expect(() => {
      globalConfigManager.activeRoundId;
    }).to.throw("activeRoundId not defined");
  });

  it("Should not get config 0", function () {
    const config = globalConfigManager.getGlobalConfig(10);
    expect(config.startRoundId).to.eq(0);
  });

  it("Should get config 150", function () {
    const config = globalConfigManager.getGlobalConfig(170);
    expect(config.startRoundId).to.eq(150);
  });

  it("Should get VerifierRouter", function () {
    const verifierRouter = globalConfigManager.getVerifierRouter(170);
    assert(verifierRouter);
  });

  it("Should not get VerifierRouter and exit", function () {
    const stub = sinon.stub(process, "exit").withArgs(1);
    const config = globalConfigManager.getVerifierRouter(10);
    assert(!config);
    assert(stub.called);
  });
});

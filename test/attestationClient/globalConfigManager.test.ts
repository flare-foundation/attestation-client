// yarn test test/attestationClient/globalConfigManager.test.ts

import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { expect, assert } from "chai";
import { GlobalConfigManager } from "../../src/attester/GlobalConfigManager";
import { getGlobalLogger, initializeTestGlobalLogger, setLoggerName } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
import sinon from "sinon";
import { sourceAndTypeSupported } from "../../src/attester/configs/GlobalAttestationConfig";
import { before } from "mocha";
import { readSecureConfig } from "../../src/utils/config/configSecure";

describe(`Global Config Manager (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  let globalConfigManager: GlobalConfigManager;
  let globalConfigManager2: GlobalConfigManager;

  before(async function () {
    const CONFIG_PATH_ATTESTER = "../test/attestationClient/test-data/attester";
    process.env.TEST_CREDENTIALS = "1";
    process.env.CONFIG_PATH = CONFIG_PATH_ATTESTER;

    const attestationClientConfig = await readSecureConfig(new AttestationClientConfig(), `attester_1`);
    globalConfigManager = new GlobalConfigManager(attestationClientConfig, getGlobalLogger());
    globalConfigManager.activeRoundId = 160;

    const attestationClientConfig2 = await readSecureConfig(new AttestationClientConfig(), `attester_2`);
    globalConfigManager2 = new GlobalConfigManager(attestationClientConfig, getGlobalLogger());
    globalConfigManager2.activeRoundId = 5;
  });

  afterEach(function () {
    sinon.restore();
  });

  after(function () {
    delete process.env.TEST_CREDENTIALS;
    delete process.env.CONFIG_PATH;
  });

  it("Should construct GlobalConfigManager", function () {
    assert(globalConfigManager);
  });

  it("Should initialize", async function () {
    await globalConfigManager.initialize();
    await globalConfigManager2.initialize();
    expect(globalConfigManager.attestationConfigs.length).to.be.equal(1);
    expect(globalConfigManager2.attestationConfigs.length).to.be.equal(2);
    expect(globalConfigManager.attestationConfigs[0].startRoundId).to.eq(150);
  });

  it("Should not get config", function () {
    const config = globalConfigManager.getConfig(10);
    expect(config).to.be.null;
  });

  it("Should get config", function () {
    const config = globalConfigManager.getConfig(170);
    expect(config.startRoundId).to.eq(150);
  });

  it("Should not get SourceLimiterConfig #1", function () {
    const config = globalConfigManager.getSourceLimiterConfig(2, 10);
    assert(!config);
  });

  it("Should not get SourceLimiterConfig #2", function () {
    const config = globalConfigManager.getSourceLimiterConfig(15, 150);
    assert(!config);
  });

  it("Should get SourceLimiterConfig", function () {
    const config = globalConfigManager.getSourceLimiterConfig(2, 170);
    assert(config);
  });

  it("Should get VerifierRouter", function () {
    const config = globalConfigManager.getVerifierRouter(170);
    assert(config);
  });

  it("Should not get VerifierRouter and exit", function () {
    const stub = sinon.stub(process, "exit").withArgs(1);
    const config = globalConfigManager.getVerifierRouter(10);
    assert(!config);
    assert(stub.called);
  });

  describe("Global Attestation Config", function () {
    it("should verify supported types", function () {
      const res = sourceAndTypeSupported(globalConfigManager.attestationConfigs[0], 2, 3);
      assert(res);
    });

    it("should deny unsupported chains", function () {
      const res = sourceAndTypeSupported(globalConfigManager.attestationConfigs[0], 10, 3);
      assert(!res);
    });

    it("should deny unsupported types", function () {
      const res = sourceAndTypeSupported(globalConfigManager.attestationConfigs[0], 2, 10);
      assert(!res);
    });
  });
});

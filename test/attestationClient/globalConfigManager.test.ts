// yarn test test/attestationClient/globalConfigManager.test.ts

import { AttestationClientConfig } from "../../src/attester/configs/AttestationClientConfig";
import { expect, assert } from "chai";
import { GlobalConfigManager } from "../../src/attester/GlobalConfigManager";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";
import sinon from "sinon";
import { VerifierRouter } from "../../src/verification/routing/VerifierRouter";
import { initialize } from "passport";
import { sourceAndTypeSupported } from "../../src/attester/configs/GlobalAttestationConfig";

describe(`Global Config Manager (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  const attestationClientConfig = new AttestationClientConfig();

  const globalConfigManager = new GlobalConfigManager(attestationClientConfig, 150, getGlobalLogger());
  globalConfigManager.testing = true;

  afterEach(function () {
    sinon.restore();
  });
  it("Should construct GlobalConfigManager", function () {
    assert(globalConfigManager);
  });

  it("Should initialize", async function () {
    await globalConfigManager.initialize();
    expect(globalConfigManager.attestationConfigs.length).to.be.greaterThanOrEqual(1);
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

  describe("globalAttestationConfig", function () {
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

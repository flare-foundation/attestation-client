// yarn test test/server/web-server.test.ts

import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from "@nestjs/testing";
import axios from "axios";
import chai, { assert, expect } from "chai";
import { ServerConfigurationService } from "../../src/servers/web-server/src/services/server-configuration.service";
import { WebServerModule } from "../../src/servers/web-server/src/web-server.module";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { getTestFile } from "../test-utils/test-utils";

describe(`Web-server (so far with empty database) (${getTestFile(__filename)})`, function () {
  let app: INestApplication;
  let configurationService: ServerConfigurationService;
  initializeTestGlobalLogger();
  before(async function () {
    process.env.SECURE_CONFIG_PATH = "./test/server/test-data";
    process.env.NODE_ENV = "development";

    process.env.TEST_IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST = "1";
    process.env.TEST_CREDENTIALS = "1";

    const module = await Test.createTestingModule({
      imports: [WebServerModule],
    }).compile();

    app = module.createNestApplication();
    app.useWebSocketAdapter(new WsAdapter(app));
    configurationService = app.get("SERVER_CONFIG") as ServerConfigurationService;
    let port = configurationService.serverCredentials.port;
    const logger = getGlobalLogger();
    await app.listen(port, undefined, () => {
      logger.info(`Server started listening at http://localhost:${configurationService.serverCredentials.port}`);
      logger.info(`Websocket server started listening at ws://localhost:${configurationService.serverCredentials.port}`);
    });
    await app.init();
  });

  after(async () => {
    delete process.env.TEST_CREDENTIALS;
    delete process.env.SECURE_CONFIG_PATH;
    delete process.env.TEST_IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST;

    await app.close();
  });

  it("Should get the table of requests for a round", async function () {
    const resp = await axios.get(`http://localhost:${configurationService.serverCredentials.port}/api/proof/requests-for-round/2751735`);
    expect(resp.data.status).to.eq("OK");
    expect(resp.data.data.length).to.eq(3);
    expect(resp.data.data[0].roundId).to.eq(2751735);
  });

  it("Should not get a table of requests for a round for a unfinalised round", async function () {
    const resp = await axios.get(`http://localhost:${configurationService.serverCredentials.port}/api/proof/requests-for-round/27409770000`);
    expect(resp.data.status).to.eq("ERROR");
    expect(resp.data.data).to.be.undefined;
  });

  it("Should get table of results (confirmed request) for a round", async function () {
    const resp = await axios.get(`http://localhost:${configurationService.serverCredentials.port}/api/proof/votes-for-round/2751736`);
    expect(resp.data.status).to.eq("OK");
    expect(resp.data.data[0].roundId).to.eq(2751736);
  });

  it("Should not get table of results (confirmed request) for a round in the future", async function () {
    const resp = await axios.get(`http://localhost:${configurationService.serverCredentials.port}/api/proof/votes-for-round/274097800`);
    expect(resp.data.status).to.eq("ERROR");
    expect(resp.data.data).to.be.undefined;
  });

  it("Should get specific proof for a request", async function () {
    const resp = await axios.post(`http://localhost:${configurationService.serverCredentials.port}/api/proof/get-specific-proof`, {
      roundId: 2751736,
      requestBytes:
        "0x0001000000026bc43c39eed5effef28dd065b180819f0b0cdb9c303913aadc009603bf62d0e99735df203e0f80e59120fbe07e2ff8324be470e408c664b4fa86bc40b4cfe9c3000003b60000",
    });
    const resp2 = await axios.get(`http://localhost:${configurationService.serverCredentials.port}/api/proof/votes-for-round/2751736`);
    expect(resp.data.status).to.eq("OK");
    expect(resp.data.data.roundId).to.eq(2751736);
  });

  it("Should not get specific proof for a request that does not exist", async function () {
    const resp = await axios.post(`http://localhost:${configurationService.serverCredentials.port}/api/proof/get-specific-proof`, {
      roundId: 2751736,
      requestBytes:
        "0x000100000003fcc56a2e4fee0a7830de7e8aa0597e0fe34750174be9d73b6f28a4559f9b3fe69735df203e0f80e59120fbe07e2ff8324be470e408c664b4fa86bc40b4cfe9c3000003b60000",
    });

    expect(resp.data.status).to.eq("ERROR");
    expect(resp.data.data).to.be.undefined;
  });

  it("Should get status", async function () {
    const resp = await axios.get(`http://localhost:${configurationService.serverCredentials.port}/api/proof/status`);
    expect(resp.data.data.latestAvailableRoundId).to.eq(2751737);
  });
});

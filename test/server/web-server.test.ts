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

process.env.NODE_ENV = "development";
process.env.TEST_CREDENTIALS = "1";
process.env.SECURE_CONFIG_PATH = "./test/server/test-data";
process.env.TEST_IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST = "1";

describe(`Web-server (so far with empty database) (${getTestFile(__filename)})`, function () {
  let app: INestApplication;
  let configurationService: ServerConfigurationService;

  // initializeTestGlobalLogger();
  before(async function () {
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

  it("Should get empty table for a round a", async function () {
    const resp = await axios.get(`http://localhost:${configurationService.serverCredentials.port}/api/proof/votes-for-round/123`, {
      headers: {},
    });

    expect(resp.data.status).to.eq("OK");
  });
});

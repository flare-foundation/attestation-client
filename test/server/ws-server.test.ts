import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from '@nestjs/testing';
import { WSServerConfigurationService } from "../../lib/servers/common/src";
// import { CommonModule } from "@atc/common";
import { WsServerModule } from "../../lib/servers/ws-server/src/ws-server.module";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { WsClient } from "../../lib/verification/client/WsClient";
import { assert } from "chai";
import { WsClientOptions } from "../../lib/verification/client/WsClientOptions";
import { sleepMs } from "@flarenetwork/mcc";

const API_KEY = "123456"
const WS_URL = `ws://localhost:9500?apiKey=7890`;

const defaultWsClientOptions: WsClientOptions = new WsClientOptions();

describe("Test websocket verifier server ", () => {

  let app: INestApplication;

  before(async () => {
    initializeTestGlobalLogger();

    process.env.CONFIG_PATH = ".secure.dev";
    process.env.NODE_ENV = "development";
    const module = await Test.createTestingModule({
      imports: [WsServerModule],
      // providers: [WsServerService, WsServerGateway, AuthGuard],
    }).compile();
    app = module.createNestApplication();

    app.useWebSocketAdapter(new WsAdapter(app));

    // unique test logger
    const logger = getGlobalLogger("web");

    const configurationService = app.get(WSServerConfigurationService);

    let port = configurationService.wsServerConfiguration.port;
    await app.listen(port, undefined, () =>
      // tslint:disable-next-line:no-console
      // console.log(`Server started listening at http://localhost:${ port }`)
      logger.info(`Websocket server started listening at ws://localhost:${configurationService.wsServerConfiguration.port}`));

    await app.init();
  });

  it(`Should connect `, async () => {
    const client = new WsClient<any, any>(defaultWsClientOptions);
    await client.connect(WS_URL);
    assert(client.connected, `Client should be connected`);
    client.disconnect();
  });

  it(`Should disconnect`, async function () {
    const client = new WsClient<any, any>(defaultWsClientOptions);
    await client.connect(WS_URL);
    client.disconnect();
    assert(!client.connected, `Client should be connected`);
  });

  it(`Should send and receive a message `, async function () {
    const client = new WsClient<any, any>(defaultWsClientOptions, true);
    await client.connect(WS_URL);
    const data = { a: 1, b: "two" };
    let res = await client.send(data, "mirror");
    assert(res.id === "test_0", "Wrong id");
    client.disconnect();
  });

  after(async () => {
    await app.close();
  });

});



// async function testClient() {

//   const logger = getGlobalLogger();

//   const client = new VerificationClient();

//   logger.info( `connecting to VPWS...` );
//   try {
//     await client.connect(`localhost`, `123456`);
//   }
//   catch( error ) {
//     logger.info( `connection failed '${error}'` );
//     return;
//   }
//   logger.info( `connected.` );


//   logger.info( `sending verification request` );
//   try {
//     const res = await client.verify(242237 ,"0x000300000000000000000000000000066260a797063291d8c476187d0cf1a6e5e0a2a0973b24",true);
//     logger.info( `processed ${res.status}` );
//   }
//   catch( error ) {
//     logException( error , "" );
//   }

//   client.disconnect();
//   logger.info( `done.` );
// }

// testClient();
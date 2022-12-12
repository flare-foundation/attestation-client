import { sleepMs } from "@flarenetwork/mcc";
import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from '@nestjs/testing';
import chai, { assert, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { WSServerConfigurationService } from "../../lib/servers/common/src";
import { WsServerModule } from "../../lib/servers/ws-server/src/ws-server.module";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { IIdentifiable } from "../../lib/utils/PromiseRequestManager";
import { WsClient } from "../../lib/verification/client/WsClient";
import { WsClientOptions } from "../../lib/verification/client/WsClientOptions";

chai.use(chaiAsPromised);
const WS_URL = `ws://localhost:9500?apiKey=7890`;

const defaultWsClientOptions: WsClientOptions = new WsClientOptions();
defaultWsClientOptions.url = WS_URL;

interface TestData extends IIdentifiable {
  a: number;
  b: string;
}

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
    const client = new WsClient<TestData, TestData>(defaultWsClientOptions);
    await client.connect();
    assert(client.connected, `Client should be connected`);
    client.disconnect();
  });

  it(`Should disconnect`, async function () {
    const client = new WsClient<TestData, TestData>(defaultWsClientOptions);
    await client.connect();
    client.disconnect();
    assert(!client.connected, `Client should be connected`);
  });

  it(`Should send and receive a message `, async function () {
    const client = new WsClient<TestData, TestData>(defaultWsClientOptions, true);
    await client.connect();
    const data = { a: 1, b: "two" };
    let res = await client.send(data, "mirror");
    assert(res.id === "test_0", "Wrong id");
    client.disconnect();
  });

  it(`Should send and receive many messages `, async function () {
    const client = new WsClient<TestData, TestData>(defaultWsClientOptions, true);
    await client.connect();
    const N = 200;
    let promises = [];
    for (let i = 0; i < N; i++) {
      const data = { a: i, b: "two" };
      promises.push(client.send(data, "mirror"));
    }
    let responses = await Promise.all(promises);
    for (let i = 0; i < N; i++) {
      let res = responses[i];
      assert(res.id === `test_${i}`, "Wrong id");
      assert(res.a === i, "Wrong data");
    }
    client.disconnect();
  });

  it(`Should fail to authenticate`, async function () {
    const client = new WsClient<TestData, TestData>({
      ...defaultWsClientOptions,
      url: WS_URL + 'x'  // wrong API key
    }, true);
    await expect(client.connect()).to.eventually.be.rejectedWith("authorizationFailed").and.be.an.instanceOf(Error);
    client.disconnect();
  });

  it(`Should obtain a ping-pong record`, async function () {
    const checkAliveIntervalMs = 100;
    const client = new WsClient<TestData, TestData>({
      ...defaultWsClientOptions,
      checkAliveIntervalMs
    }, true);
    await client.connect();
    let rec1 = await client.getNextPingPongTimes();
    assert(rec1[0] && rec1[1] && rec1[0] <= rec1[1], "Ping pong record does not exist");
    assert(client.pingPongRecords.size === 0, "Ping pong records not cleared")
    client.disconnect();
  });

  it(`Should obtain two sequential ping-pong records`, async function () {
    const checkAliveIntervalMs = 100;
    const client = new WsClient<TestData, TestData>({
      ...defaultWsClientOptions,
      checkAliveIntervalMs
    }, true);
    await client.connect();
    let rec1 = await client.getNextPingPongTimes();
    assert(rec1[0] && rec1[1] && rec1[0] <= rec1[1], "Ping pong record does not exist");
    await sleepMs(50);
    let rec2 = await client.getNextPingPongTimes();
    assert(rec2[0] && rec2[1] && rec2[0] <= rec2[1], "Ping pong record does not exist");
    assert(rec2[0].getTime() - rec1[0].getTime() >= checkAliveIntervalMs - 2, "Two pings are not separated enough");
    assert(client.pingPongRecords.size === 0, "Ping pong records not cleared")
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
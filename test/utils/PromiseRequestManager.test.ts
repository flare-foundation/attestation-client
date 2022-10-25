import chai, { assert, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { getGlobalLogger } from "../../lib/utils/logger";
import { IIdentifiable, PromiseRequestManager } from "../../lib/utils/PromiseRequestManager";
chai.use(chaiAsPromised);

interface PingRequest extends IIdentifiable {
  id: number;
  data: string;
}

interface PongResponse extends IIdentifiable {
  id: number;
  data: string;
}

async function sendPingGetPong(request: PingRequest, manager: PromiseRequestManager<PingRequest, PongResponse>, timeout: number) {
  setTimeout(() => {
    manager.onResponse({
      id: request.id,
      data: `pong_${request.id}`
    })
  }, timeout)
}

describe("PromiseRequestHandler", () => {
  let logger = getGlobalLogger("test");

  it("Should send and receive a request", async () => {
    let requestHandler = new PromiseRequestManager<PingRequest, PongResponse>(5000, logger);
    let request = {
      data: "ping"
    } as PingRequest;
    let res = await requestHandler.sendRequest(request, (req: PingRequest) => sendPingGetPong(req, requestHandler, 100));
    // id was added
    assert(res.id === 0, `Id was not added`);
    // response received
    assert(res.data === "pong_0", `Wrong response '${res.data}', should be 'pong'`);
  });

  it("Should timeout on long request", async () => {
    let timeout = 200;
    let requestHandler = new PromiseRequestManager<PingRequest, PongResponse>(timeout, logger);
    let request = {
      data: "ping"
    } as PingRequest;
    await expect(requestHandler.sendRequest(request, (req: PingRequest) => sendPingGetPong(req, requestHandler, timeout + 20))).to.be.rejected;
  });

  it("Should send and receive many requests", async () => {
    let N = 200;
    let requestHandler = new PromiseRequestManager<PingRequest, PongResponse>(5000, logger);
    assert(requestHandler.activeRequests === 0);
    let promises = [];
    for (let i = 0; i < N; i++) {
      let request = {
        data: "ping"
      } as PingRequest;
      promises.push(requestHandler.sendRequest(request, (req: PingRequest) => sendPingGetPong(req, requestHandler, Math.floor(100*Math.random()))));
    }
    let responses = await Promise.all(promises);
    for (let i = 0; i < N; i++) {
      let res = responses[i]
      // id was added
      assert(res.id === i, `Id was not added`);
      // response received
      assert(res.data === `pong_${i}`, `Wrong response '${res.data}', should be 'pong'`);
    }

    assert(requestHandler.activeRequests === 0);
  });


});

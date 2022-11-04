import chai, { assert, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { getGlobalLogger } from "../../lib/utils/logger";
import { IIdentifiable, PromiseRequestManager } from "../../lib/utils/PromiseRequestManager";
chai.use(chaiAsPromised);

interface PingRequest extends IIdentifiable {
  data: string;
}

interface PongResponse extends IIdentifiable {
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
    const requestHandler = new PromiseRequestManager<PingRequest, PongResponse>(5000, logger, true);
    const request = {
      data: "ping"
    } as PingRequest;
    let res = await requestHandler.sendRequest(request, (req: PingRequest) => sendPingGetPong(req, requestHandler, 100));
    // id was added
    assert(res.id, `Id was not added`);
    // response received
    assert(res.data === "pong_test_0", `Wrong response '${res.data}', should be 'pong_test_0'`);
  });

  it("Should timeout on long request", async () => {
    const timeout = 200;
    const requestHandler = new PromiseRequestManager<PingRequest, PongResponse>(timeout, logger);
    const request = {
      data: "ping"
    } as PingRequest;
    await expect(requestHandler.sendRequest(request, (req: PingRequest) => sendPingGetPong(req, requestHandler, timeout + 20))).to.be.rejected;
  });

  it("Should send and receive many requests", async () => {
    const N = 200;
    const requestHandler = new PromiseRequestManager<PingRequest, PongResponse>(5000, logger, true);
    assert(requestHandler.activeRequests === 0);
    const promises = [];
    for (let i = 0; i < N; i++) {
      const request = {
        data: "ping"
      } as PingRequest;
      promises.push(requestHandler.sendRequest(request, (req: PingRequest) => sendPingGetPong(req, requestHandler, Math.floor(100*Math.random()))));
    }
    const responses = await Promise.all(promises);
    for (let i = 0; i < N; i++) {
      const res = responses[i]
      // id was added
      assert(res.id === `test_${i}`, `Id was not added`);
      // response received
      assert(res.data === `pong_test_${i}`, `Wrong response '${res.data}', should be 'pong'`);
    }

    assert(requestHandler.activeRequests === 0);
  });


});

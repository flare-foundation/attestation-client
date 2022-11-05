import chai, { assert, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { getGlobalLogger } from "../../lib/utils/logger";
import { IIdentifiable, IIdentifiableResponse, PromiseRequestManager, WsResponseStatus } from "../../lib/utils/PromiseRequestManager";
chai.use(chaiAsPromised);

interface PingRequest extends IIdentifiable {
  text: string;
}

interface PongResponse extends IIdentifiable {
  responseText: string;
};

async function sendPingGetPong(request: PingRequest, manager: PromiseRequestManager<PingRequest, PongResponse>, timeout: number, errorMessage?: string) {
  setTimeout(() => {
    let response = {
      status: "OK",
      data: {
        id: request.id,
        responseText: `pong_${request.id}`
      }
    } as IIdentifiableResponse<PongResponse>;
    if (errorMessage) {
      response.status = "ERROR";
      response.errorMessage = errorMessage;      
    }
    manager.onResponse(response)
  }, timeout)
}

describe("PromiseRequestHandler", () => {
  let logger = getGlobalLogger("test");

  it("Should send and receive a request", async () => {
    const requestHandler = new PromiseRequestManager<PingRequest, PongResponse>(5000, logger, true);
    const request = {
      text: "ping"
    } as PingRequest;
    let res = await requestHandler.sendRequest(request, (req: PingRequest) => sendPingGetPong(req, requestHandler, 100));
    // id was added
    assert(res.id, `Id was not added`);
    // assert(res.status === 'OK', `Status incorrect`);
    // response received
    assert(res.responseText === "pong_test_0", `Wrong response '${res.responseText}', should be 'pong_test_0'`);
  });

  it("Should timeout on long request", async () => {
    const timeout = 200;
    const requestHandler = new PromiseRequestManager<PingRequest, PongResponse>(timeout, logger);
    const request = {
      text: "ping"
    } as PingRequest;
    await expect(requestHandler.sendRequest(request, (req: PingRequest) => sendPingGetPong(req, requestHandler, timeout + 20))).to.be.rejected;
  });

  it("Should return wrong status", async () => {
    const requestHandler = new PromiseRequestManager<PingRequest, PongResponse>(5000, logger, true);
    const request = {
      text: "ping"
    } as PingRequest;
    let errorMessage = "Error Message"
    try {
      let res = await requestHandler.sendRequest(request, (req: PingRequest) => sendPingGetPong(req, requestHandler, 100, errorMessage));
    } catch (reason) {
      let response = reason as IIdentifiableResponse<PongResponse>;
      // id was added
      assert(response.data.id === "test_0", `Id was not added`);
      assert(response.status === 'ERROR', `Status incorrect`);
      assert(response.errorMessage === errorMessage, `Wrong error message`);
      // response received
      assert(response.data.responseText === "pong_test_0", `Wrong response '${response.data.responseText}', should be 'pong_test_0'`);

    }

  });

  it("Should send and receive many requests", async () => {
    const N = 200;
    const requestHandler = new PromiseRequestManager<PingRequest, PongResponse>(5000, logger, true);
    assert(requestHandler.activeRequests === 0);
    const promises = [];
    for (let i = 0; i < N; i++) {
      const request = {
        text: "ping"
      } as PingRequest;
      promises.push(requestHandler.sendRequest(request, (req: PingRequest) => sendPingGetPong(req, requestHandler, Math.floor(100 * Math.random()))));
    }
    const responses = await Promise.all(promises);
    for (let i = 0; i < N; i++) {
      const res = responses[i] as PongResponse;
      // id was added
      assert(res.id === `test_${i}`, `Id was not added`);
      // response received
      assert(res.responseText === `pong_test_${i}`, `Wrong response '${res.responseText}', should be 'pong'`);
    }

    assert(requestHandler.activeRequests === 0);
  });


});

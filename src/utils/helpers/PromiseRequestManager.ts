import { AttLogger } from "../logging/logger";
import { randomUUID } from "crypto";
import { PromiseRequestsHandler } from "./PromiseRequestsHandler";
import { IIdentifiable, IIdentifiableResponse } from "./promiseRequestTypes";

/**
 * A manager class for managing websocket like communication. Here and IIdentifiable request is made
 * and sent using `sendRequest` method which creates a promise. When an external entity triggers
 * `onResponse` method the matching response resolves the above created promise. Matching is
 * done through id.
 */
export class PromiseRequestManager<R extends IIdentifiable, S extends IIdentifiable> {
  openRequests: Map<string, PromiseRequestsHandler<R, S>>;
  _nextId = 0;
  _timeout = 5000;
  _test = false;
  _testCounter = 0;
  logger: AttLogger;

  constructor(timeout = 5000, logger: AttLogger, test = false) {
    this._timeout = timeout;
    this.logger = logger;
    this._test = test;
    this.openRequests = new Map<string, PromiseRequestsHandler<R, S>>();
  }

  get timeout(): number {
    return this._timeout;
  }

  /**
   * Returns next random id
   */
  private get nextId(): string {
    if (this._test) {
      return `test_${this._testCounter++}`;
    }
    return randomUUID();
  }

  /**
   * Resolves specific promise matching the `id` from the `response`
   * @param response
   */
  public onResponse(response: IIdentifiableResponse<S>): void {
    let promiseHandler = this.openRequests.get(response.data.id);
    if (promiseHandler) {
      if (response.status === "OK") {
        promiseHandler.resolve(response.data);
        return;
      }
      promiseHandler.reject(response, response.data.id);
    }
  }

  /**
   * Clears the promise matching to `id` from the internal mapping of active promises.
   * @param id
   */
  public clearId(id: string) {
    this.openRequests.delete(id);
  }

  /**
   * Creates a promise for a identifiable call for `request`. The promise either timeouts
   * or returns matching response (the response with the matching `id`).
   * @param request
   * @param senderCall
   * @returns
   */
  public async sendRequest(request: R, senderCall: (req: R) => Promise<void>): Promise<S> {
    let promiseHandler = new PromiseRequestsHandler<R, S>(request, this);
    request.id = this.nextId;
    this.openRequests.set(request.id, promiseHandler);
    return promiseHandler.send(senderCall);
  }

  /**
   * Returns the number of current open requests
   */
  public get activeRequests(): number {
    return this.openRequests.size;
  }
}

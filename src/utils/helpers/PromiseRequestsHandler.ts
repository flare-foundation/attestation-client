import { stringify } from "safe-stable-stringify";
import { PromiseRequestManager } from "./PromiseRequestManager";
import { IIdentifiable, PromiseRequestStatus } from "./promiseRequestTypes";

/**
 * A wrapper class for time-outed request like promise used in websocket communication.
 * It is used within PromiseRequestManager.
 */

export class PromiseRequestsHandler<R extends IIdentifiable, S extends IIdentifiable> {
  _promise: Promise<S>;
  _resolve: (res: S) => void;
  _reject: (reason: any) => void;
  _timer: NodeJS.Timeout;
  _status: PromiseRequestStatus;
  _request: R;
  _manager: PromiseRequestManager<R, S>;

  constructor(request: R, manager: PromiseRequestManager<R, S>) {
    this._request = request;
    this._manager = manager;
  }

  /**
   * Calls the sending call `onSend` and creates the packed promise, which should be resolved externally
   * by the call on `resolve()` method.
   * @param onSend
   * @returns
   */
  public async send(onSend: (req: R) => Promise<void>): Promise<S> {
    if (this._status === PromiseRequestStatus.pending) {
      throw new Error(`Pending promise, cannot send request ${this.printoutRequest()}`);
    }
    if (this._status === PromiseRequestStatus.resolved) {
      throw new Error(`Resolved promise, cannot send request ${this.printoutRequest()}`);
    }
    if (this._status === PromiseRequestStatus.rejected) {
      throw new Error(`Rejected promise, cannot send request ${this.printoutRequest()}`);
    }

    this._status = PromiseRequestStatus.pending;
    // this one can throw, and the exception bubbles up
    this._promise = new Promise((resolve: (res: S) => void, reject: (reason: any) => void) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    // timeouting the promise
    if (this._manager.timeout) {
      this._timer = setTimeout(() => {
        this.reject(new Error(`Request timeout after ${this._manager.timeout}ms: \n${this.printoutRequest()}`), this._request.id);
      }, this._manager.timeout);
    }

    // this resolution of this promise should not be relevant. Should not be awaited
    onSend(this._request)
      .then((res) => {})
      .catch((e) => this.reject(e, this._request.id));

    return this._promise;
  }

  /**
   * Resolves the packed promise with `value`
   * @param value
   */
  public resolve(value: S): void {
    if (this._status === PromiseRequestStatus.pending) {
      clearTimeout(this._timer);
      this._status = PromiseRequestStatus.resolved;
      this._manager.clearId(value.id);
      this._resolve(value);
    }
  }

  /**
   * Rejects the packed promise with `reason`
   * @param reason
   */
  public reject(reason: any, id: string): void {
    if (this._status === PromiseRequestStatus.pending) {
      clearTimeout(this._timer);
      this._status = PromiseRequestStatus.rejected;
      this._manager.clearId(id);
      this._reject(reason);
    }
  }

  /**
   * Prints out the request data
   * @returns
   */
  private printoutRequest(): string {
    return stringify(this._request, null, 2);
  }
}

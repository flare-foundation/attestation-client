import { AttLogger } from "./logger";
import { stringify } from "safe-stable-stringify";
import { randomUUID } from "crypto";

export enum PromiseRequestStatus {
   initialized,
   pending,
   rejected,
   resolved
}

export interface IIdentifiable {
   id?: string;
}

/**
 * A wrapper class for timeouted request like promise used in websocket communication.
 * It is used within PromiseRequestManager.
 */
export class PromiseRequestsHandler<R extends IIdentifiable, S extends IIdentifiable> {
   _promise: Promise<S>;
   _resolve: (res: S) => void;
   _reject: (reason: any) => void;
   _timer: NodeJS.Timeout;
   _status: PromiseRequestStatus;
   _request: R;
   _timeout: number;

   constructor(request: R, timeout: number) {
      this._request = request;
      this._timeout = timeout;
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
      })
      // timeouting the promise
      if (this._timeout) {
         this._timer = setTimeout(() => {
            this.reject(new Error(`Request timeout after ${this._timeout}ms: \n${this.printoutRequest()}`))
         }, this._timeout);
      };

      // this resolution of this promise should not be relevant. Should not be awaited
      onSend(this._request).then(res => { }).catch(e => this.reject(e));

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
         this._resolve(value);
      }
   }

   /**
    * Rejects the packed promise with `reason`
    * @param reason 
    */
   public reject(reason: any): void {
      if (this._status === PromiseRequestStatus.pending) {
         clearTimeout(this._timer);
         this._status = PromiseRequestStatus.rejected;
         this._reject(reason)
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

/**
 * A manager class for managing websocket like communication. Here and IIdentifiable request is made 
 * and sent using `sendRequest` method which creates a promise. When an external entity triggers
 * `onResponse` method the matching response resolves the above created promise. Matching is 
 * done through id.
 */
export class PromiseRequestManager<R extends IIdentifiable, S extends IIdentifiable> {
   openRequests: Map<string, PromiseRequestsHandler<R, S>>;
   _nextId = 0; // TODO: if you restart and promises are late, what to do. Maybe random ID is better.
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

   /**
    * Returns next random id
    */
   private get nextId(): string {
      if(this._test) {
         return `test_${this._testCounter++}`;
      }
      return randomUUID();
   }

   /**
    * Resolves specific promise matching the `id` from the `response`
    * @param response 
    */
   public onResponse(response: S): void {
      let promiseHandler = this.openRequests.get(response.id);
      if (promiseHandler) {
         promiseHandler.resolve(response);
         this.openRequests.delete(response.id)
      }
   }

   /**
    * Creates a promise for a identifiable call for `request`. The promise either timeouts 
    * or returns matching response (the response with the matching `id`).
    * @param request 
    * @param senderCall 
    * @returns 
    */
   public async sendRequest(request: R, senderCall: (req: R) => Promise<void>): Promise<S> {
      let promiseHandler = new PromiseRequestsHandler<R, S>(request, this._timeout);
      request.id = this.nextId;
      this.openRequests.set(request.id, promiseHandler)
      return promiseHandler.send(senderCall)
   }

   /**
    * Returns the number of current open requests
    */
   public get activeRequests(): number {
      return this.openRequests.size;
   }

}

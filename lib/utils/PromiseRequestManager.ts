import { AttLogger } from "./logger";

export enum PromiseRequestStatus {
   initialized,
   pending,
   rejected,
   resolved
}

export interface IIdentifiable {
   id?: number;
}

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
      // this one can throw, and the exception bubbles up
      this._status = PromiseRequestStatus.pending;
      this._promise = new Promise((resolve: (res: S) => void, reject: (reason: any) => void) => {
         this._resolve = resolve;
         this._reject = reject;
      })
      if (this._timeout) {
         this._timer = setTimeout(() => {
            this.reject(new Error(`Request timeout after ${this._timeout}ms: \n${this.printoutRequest()}`))
         }, this._timeout);
      }
      onSend(this._request).catch(e => this.reject(e));  // do not await
      return this._promise;
   }

   public resolve(value: S): void {
      if (this._status === PromiseRequestStatus.pending) {
         clearTimeout(this._timer);
         this._status = PromiseRequestStatus.resolved;
         this._resolve(value);
      }
   }

   public reject(reason: any): void {
      if (this._status === PromiseRequestStatus.pending) {
         clearTimeout(this._timer);
         this._status = PromiseRequestStatus.rejected;
         this._reject(reason)
      }
   }

   private printoutRequest(): string {
      return JSON.stringify(this._request, null, 2);
   }
}

export class PromiseRequestManager<R extends IIdentifiable, S extends IIdentifiable> {
   openRequests: Map<number, PromiseRequestsHandler<R, S>>;
   _nextId = 0; // TODO: if you restart and promises are late, what to do. Maybe random ID is better.
   _timeout = 5000;
   logger: AttLogger;

   constructor(timeout = 5000, logger: AttLogger) {
      this._timeout = timeout;
      this.logger = logger;
      this.openRequests = new Map<number, PromiseRequestsHandler<R, S>>();
   }

   private get nextId(): number {
      return this._nextId++;
   }

   public onResponse(response: S): void {
      let promiseHandler = this.openRequests.get(response.id);
      if (promiseHandler) {
         promiseHandler.resolve(response);
         this.openRequests.delete(response.id)
      }
   }

   public async sendRequest(request: R, senderCall: (req: R) => Promise<void>): Promise<S> {
      let promiseHandler = new PromiseRequestsHandler<R, S>(request, this._timeout);
      request.id = this.nextId;
      this.openRequests.set(request.id, promiseHandler)
      return promiseHandler.send(senderCall)
   }

   public get activeRequests(): number {
      return this.openRequests.size;
   }

}

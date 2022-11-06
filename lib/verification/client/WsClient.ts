import stringify from 'safe-stable-stringify';
import WebSocket, { Event } from 'ws';
import { AttLogger, getGlobalLogger } from '../../utils/logger';
import { IIdentifiable, PromiseRequestManager } from '../../utils/PromiseRequestManager';
import { sleepms } from '../../utils/utils';
import { WsClientOptions } from './WsClientOptions';

const WS_POLLING_INTERVAL = 100; // ms

export interface IIdentifiableWsMessage<T> extends IIdentifiable {
  event: string;
  data: T;
}

export class WsClient<R extends IIdentifiable, S extends IIdentifiable> {

  logger: AttLogger = getGlobalLogger();

  id: string = "";

  socket: WebSocket = null;

  connected = false;
  authorizationFailed = false;

  clientOptions: WsClientOptions;

  pingUpdate = null;

  isAlive = false;

  promiseRequestManager: PromiseRequestManager<R, S>;

  pingPongRecordCount = 0;
  pingPongRecords = new Map<number, PingPongRecord>();

  constructor(options: WsClientOptions, test = false) {
    this.clientOptions = options;
    this.promiseRequestManager = new PromiseRequestManager<R, S>(options.verificationTimeoutMS, this.logger, test);
  }
  /**
   * Connect to VerificationProvider server
   * @param key 
   * @param clientOptions 
   * @returns 
   */
  public async connect(): Promise<boolean> {
    this.socket = new WebSocket(this.clientOptions.url, {
      protocolVersion: 8,
      rejectUnauthorized: false
    });

    this.authorizationFailed = false;

    this.socket.on('error', (error: Event) => {
      this.logger.debug2(`Websocket error received: ${error}`);
    });

    this.socket.on('close', (event: number) => {
      if (event === 4401) {
        this.authorizationFailed = true;
        this.logger.debug2(`authorization failed`);
      }
      this.closeConnection();
    });

    this.socket.on('open', () => {
      this.logger.debug2(`client connected`);
      this.connected = true;
    });

    this.socket.on('message', (data: string) => {
      let parsedData = JSON.parse(data);
      if (parsedData?.data?.id && typeof parsedData.data.id === "string") {
        this.promiseRequestManager.onResponse(parsedData)
      } else {
        this.logger.info(`Non identifiable response message\n${data}`)
      }
    });

    this.isAlive = true;
    this.socket.on('pong', () => {
      this.isAlive = true;
      for (let rec of this.pingPongRecords.values()) {
        rec.resolvePong();
      }  
    });

    // check if connections are alive
    this.pingUpdate = setInterval(() => {
      this.checkPing();
    }, this.clientOptions.checkAliveIntervalMs);


    return new Promise(async (resolve, reject) => {
      let timeout = 0;
      while (!this.connected) {
        await sleepms(WS_POLLING_INTERVAL);
        if (this.authorizationFailed) {
          reject(new Error("authorizationFailed"));
          return;
        }
        if (++timeout * WS_POLLING_INTERVAL > this.clientOptions.connectionTimeoutMS) {
          this.logger.error2(`connection timeout`);
          reject(new Error("timeout"));
          return;
        }
      }
      resolve(true);
    });
  }

  /**
   * Disconnect client
   * @returns 
   */
  public disconnect() {
    if (!this.socket) return;
    this.socket.close();
    this.closeConnection();
    this.logger.debug(`client[${this.id}]: disconnected`);
  }

  /**
   * Close WS connection.
   */
  private closeConnection() {
    if (this.socket) {
      this.socket.terminate();
      this.socket = null;
    }

    if (this.pingUpdate) {
      clearInterval(this.pingUpdate);
      this.pingUpdate = null;
    }

    this.connected = false;
    this.logger.debug(`client[${this.id}]: close`);
  }

  /**
   * Check if ping was responded and send a new one.
   * @returns 
   */
  private checkPing() {
    if (this.isAlive === false) {
      this.closeConnection();
      return;
    }

    this.logger.debug(`client[${this.id}]: ping`);
    this.isAlive = false;
    this.socket.ping();
    for (let rec of this.pingPongRecords.values()) {
      rec.resolvePing();
    }
  }

  /**
   * Sends a request data to a websocket marked with event name.
   * @param request 
   * @param event 
   * @returns the promise for matching response to the given request
   */
  public async send(request: R, event: string): Promise<S> {
    return this.promiseRequestManager.sendRequest(request, async (req: R) => {
      const toSend = {
        event,
        data: req
      } as IIdentifiableWsMessage<R>
      this.socket.send(stringify(toSend));
    })
  }

  /**
   * Waits for the next ping and pong and obtains their times.
   * @returns 
   */
  public async getNextPingPongTimes(): Promise<Date[]> {
    let rec = new PingPongRecord()
    return rec.record(this);
  }
}

/**
 * Auxilliary class for ping pong promise testing.
 */
export class PingPongRecord {
  _id: number;
  _client: WsClient<any, any>;
  _resolvePing: any;
  _resolvePong: any;
  _status: 'waitPing' | 'waitPong' | 'resolved' = 'waitPing'

  public async record(client: WsClient<any, any>) {
    this._status = 'waitPing';
    this._id = client.pingPongRecordCount++;
    this._client = client;
    client.pingPongRecords.set(this._id, this);
    let promises = [];
    promises.push(new Promise((resolve) => {
      this._resolvePing = resolve;
    }));
    promises.push(new Promise((resolve) => {
      this._resolvePong = resolve;
    }))
    return Promise.all(promises);
  }

  resolvePing() {
    if (this._status === 'waitPing') {
      this._status = 'waitPong';
      this._resolvePing(new Date())
    }
  }

  resolvePong() {
    if (this._status === 'waitPong') {
      this._status = 'resolved';
      this._client.pingPongRecords.delete(this._id);
      this._resolvePong(new Date());
    }
  }

}

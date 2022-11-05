import stringify from 'safe-stable-stringify';
import WebSocket, { CloseEvent, Event } from 'ws';
import { AttLogger, getGlobalLogger } from '../../utils/logger';
import { IIdentifiable, IIdentifiableResponse, PromiseRequestManager } from '../../utils/PromiseRequestManager';
import { sleepms } from '../../utils/utils';
import { WsClientOptions } from './WsClientOptions';

const WS_POLLING_INTERVAL = 100; // ms

export interface AttestationRequestMessage {
  request: string;
  roundId: number;
  recheck: boolean;
}

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

  constructor(options: WsClientOptions, test = false) {
    this.promiseRequestManager = new PromiseRequestManager<R, S>(options.verificationTimeoutMS, this.logger, test);
  }
  /**
   * Connect to VerificationProvider server
   * @param address 
   * @param key 
   * @param clientOptions 
   * @returns 
   */
  public async connect(address: string, clientOptions: WsClientOptions = null): Promise<boolean> {

    this.clientOptions = clientOptions ? clientOptions : new WsClientOptions();

    this.socket = new WebSocket(address, {
      protocolVersion: 8,
      rejectUnauthorized: false
    });

    this.authorizationFailed = false;

    this.socket.on('error', (error: Event) => {
      this.logger.debug2(`Websocket error received: ${error}`);
    });

    this.socket.on('close', (event: CloseEvent) => {
      if (event.code === 4401) {
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
    this.socket.on('pong', () => { this.isAlive = true; });

    // check if connections are alive
    this.pingUpdate = setInterval(() => {
      this.checkPing();
    }, this.clientOptions.checkAliveIntervalMs);


    return new Promise(async (resolve, reject) => {
      let timeout = 0;
      while (!this.connected) {
        await sleepms(WS_POLLING_INTERVAL);
        if (this.authorizationFailed) {
          reject("authorizationFailed");
          return;
        }
        if (++timeout * WS_POLLING_INTERVAL > this.clientOptions.connectionTimeoutMS) {
          this.logger.error2(`connection timeout`);
          reject("timeout");
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
  }

  public async send(request: R, event: string): Promise<S> {
    return this.promiseRequestManager.sendRequest(request, async (req: R) => {
      const toSend = {
        event,
        data: req
      } as IIdentifiableWsMessage<R>
      // console.log("To send:", stringify(toSend))
      this.socket.send(stringify(toSend));
    })
  }

}
import { optional } from '@flarenetwork/mcc';
import WebSocket from 'ws';
import { parseJSON } from '../../utils/config';
import { AttLogger, getGlobalLogger } from '../../utils/logger';
import { sleepms } from '../../utils/utils';
import { Verification } from '../../verification/attestation-types/attestation-types';

export class VerificationClientOptions {
  @optional() port: number = 8088;
  @optional() connectionTimeoutMS = 5000;
  @optional() verificationTimeoutMS = 5000;
  @optional() checkAliveIntervalMs = 5000;
}

export class VerificationClient {

  logger: AttLogger = getGlobalLogger();

  id: string = "";

  ws: WebSocket = null;

  connected = false;
  authorizationFailed = false;

  nextId = 1000;

  clientOptions: VerificationClientOptions;

  pingUpdate = null;

  verificationResult = new Map<number, Verification<any, any>>();
  errorResult = new Map<number, string>();

  /**
   * Connect to VerificationProvider server
   * @param address 
   * @param key 
   * @param clientOptions 
   * @returns 
   */
  public async connect(address: string, key: string, clientOptions: VerificationClientOptions = null) {

    this.clientOptions = clientOptions ? clientOptions : new VerificationClientOptions();

    this.ws = new WebSocket(`wss://${address}:${this.clientOptions.port}/api/v1/verification/connect?auth=${key}`, {
      protocolVersion: 8,
      rejectUnauthorized: false
    });

    const me = this;

    this.authorizationFailed = false;

    this.ws.on('error', function error(error) {
      if (error.message === "Unexpected server response: 401") {
        me.authorizationFailed = true;
        me.logger.debug2(`authorization failed`);
        me.closeConnection();
      }
    });
    this.ws.on('open', function open() {
      me.logger.debug2(`verification client connected`);
      me.connected = true;
    });

    this.ws.on('message', function message(data) {
      me.processMessage(data);
    });


    // detect broken link from server side
    this.ws.isAlive = true;
    this.ws.on('pong', function () { this.isAlive = true; });

    // check if connections are alive
    this.pingUpdate = setInterval(function ping() {
      me.checkPing();
    }, this.clientOptions.checkAliveIntervalMs);


    return new Promise(async (resolve, reject) => {

      let timeout = 0;
      while (!this.connected) {
        await sleepms(100);

        if (this.authorizationFailed) {
          reject("authorizationFailed");
          return;
        }

        if (++timeout * 100 > this.clientOptions.connectionTimeoutMS) {
          this.logger.error2(`connection timeout`);
          reject("timeout");
          return;
        }
      }

      resolve(true);
    });
  }

  /**
   * Process messages from server
   * @param data0 
   * @returns 
   */
  private processMessage(data0: any): boolean {
    const data = `${data0}`;
    const parameters = data.split('\t');

    const name = parameters[0];

    if (name === "error") {
      if (parameters.length != 4) { this.logger.error(`processMessage: invalid argument count ${name} '${data}'`); return false; }

      const id = parameters[1];
      const error = parameters[2];
      const comment = parameters[3];

      this.errorResult.set(parseInt(id), `${error}:${comment}`);

      this.logger.error(`client[${this.id}] response error #${id} error ${error} comment ${comment}`)

      return false;
    }

    if (name === `connected`) {
      if (parameters.length != 2) { this.logger.error(`processMessage: invalid argument count ${name} '${data}'`); return false; }

      this.id = parameters[1];

      this.logger.info(`client[${this.id}] connected`);

      return true;
    }

    if (name === `verificationResult`) {
      if (parameters.length != 6) { this.logger.error(`processMessage: invalid argument count ${name} '${data}'`); return false; }

      const res = parameters[3] !== "" ? parseJSON<Verification<any, any>>(parameters[3]) : undefined;

      this.verificationResult.set(parseInt(parameters[1]), res);

      return true;
    }

    this.logger.error(`processMessage: unknown message '${data}'`);

    return false;

  }

  /**
   * Returns next command id and increments the counter.
   * @returns
   */
  private getNextId(): number {
    return this.nextId++;
  }

  /**
   * Verify attestation
   * @param roundId 
   * @param request 
   * @param recheck 
   * @returns 
   */
  public async verify(roundId: number, request: string, recheck: boolean): Promise<Verification<any, any>> {
    const id = this.getNextId();

    this.logger.debug2(`client[${this.id}]: verify id=${id} roundId=${roundId} request='${request} recheck=${recheck}'`);

    this.ws.send(`verify\t${id}\t${roundId}\t${request}\t${recheck}`);

    return new Promise(async (resolve, reject) => {

      let timeout = 0;
      while (true) {

        // check if we got result
        if (this.verificationResult.has(id)) {
          const res = this.verificationResult.get(id);
          resolve(res);
          return;
        }

        // check if we got error
        let errorRes = this.errorResult.get(id);

        if (errorRes) {
          reject(errorRes);
          return;
        }

        await sleepms(100);

        if (++timeout * 100 > this.clientOptions.connectionTimeoutMS) {
          this.logger.error2(`client[${this.id}]: verify timeout`);
          reject("timeout");
          return;
        }
      }
    });
  }

  /**
   * Disconnect client
   * @returns 
   */
  public disconnect() {
    if (!this.ws) return;

    this.ws.close();

    this.closeConnection();

    this.logger.debug(`client[${this.id}]: disconnected`);
  }

  /**
   * Close WS connection.
   */
  private closeConnection() {
    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
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
    if (this.ws.isAlive === false) {
      this.closeConnection();
      return;
    }

    this.logger.debug(`client[${this.id}]: ping`);
    this.ws.isAlive = false;
    this.ws.ping();
  }

}
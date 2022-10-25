import WebSocket from 'ws';
import { boolean, number, string } from 'yargs';
import { parseJSON } from '../../utils/config';
import { AttLogger, getGlobalLogger, logException } from '../../utils/logger';
import { sleepms } from '../../utils/utils';
import { Verification } from '../../verification/attestation-types/attestation-types';
import { AttestationType } from '../generated/attestation-types-enum';
import { SourceId } from '../sources/sources';
import { VerificationClientOptions } from './verificationClientOptions';
 
export class VerificationType {
  sourceId: SourceId;
  attestationType: AttestationType;

  constructor(attestationType: AttestationType, sourceId: SourceId) {
      this.sourceId = sourceId;
      this.attestationType = attestationType;
  }

  toString(): string {
      return `${this.attestationType}:${this.sourceId}`;
  }
}


export interface AttestationRequestMessage {
  request: string;
  roundId: number;
  recheck: boolean;
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

  verificationResult = new Map<number, Promise<Verification<any, any>>>();

  getSupportedResult = new Map<number, VerificationType[]>();

  errorResult = new Map<number, string>();

  isAlive = false;

  /**
   * Connect to VerificationProvider server
   * @param address 
   * @param key 
   * @param clientOptions 
   * @returns 
   */
  public async connect(address: string, clientOptions: VerificationClientOptions = null): Promise<boolean> {

    this.clientOptions = clientOptions ? clientOptions : new VerificationClientOptions();

    this.ws = new WebSocket(address, {
      protocolVersion: 8,
      rejectUnauthorized: false
    });

    const me = this;

    this.authorizationFailed = false;

    this.ws.on('error', (error) => {
      if (error.message === "Unexpected server response: 401") {
        me.authorizationFailed = true;
        me.logger.debug2(`authorization failed`);
        me.closeConnection();
      }
    });
    this.ws.on('open', () => {
      me.logger.debug2(`verification client connected`);
      me.connected = true;
    });

    this.ws.on('message', (data) => {
      me.processMessage(data);
    });


    // detect broken link from server side
    // this.ws.isAlive = true;
    this.isAlive = true;
    this.ws.on('pong', () => { this.isAlive = true; });

    // check if connections are alive
    this.pingUpdate = setInterval(() => {
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
    const id = parameters.length > 0 ? parseInt(parameters[1]) : -1;

    try {


      if (name === "error") {
        if (parameters.length != 4) { this.logger.error(`processMessage: invalid argument count ${name} '${data}'`); return false; }

        const error = parameters[2];
        const comment = parameters[3];

        this.errorResult.set(id, `${error}:${comment}`);

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

        // this.verificationResult.set(id, res); // TODO
        return false;
      }

      if (name === `getSupportedResult`) {
        if (parameters.length != 3) { this.logger.error(`processMessage: invalid argument count ${name} '${data}'`); return false; }

        const res = parameters[3] !== "" ? parseJSON<VerificationType[]>(parameters[2]) : undefined;

        this.getSupportedResult.set(id, res);
        return false;
      }

    }
    catch (error) {
      logException(error, `processMessage ${data}`);
      this.errorResult.set(id, error.message);
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

    // this.ws.send(`verify\t${id}\t${roundId}\t${request}\t${recheck}`);
    this.ws.send(JSON.stringify({
      event: 'verify',
      data: {roundId, request, recheck}
    }))

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
   * Get Supported attestations
   * @param roundId 
   * @param request 
   * @param recheck 
   * @returns 
   */
   public async getSupported(): Promise<VerificationType[]> {
    const id = this.getNextId();

    this.logger.debug2(`client[${this.id}]: getSupported id=${id}'`);

    this.ws.send(`getSupported\t${id}`);

    return new Promise(async (resolve, reject) => {

      let timeout = 0;
      while (true) {

        // check if we got result
        if (this.getSupportedResult.has(id)) {
          const res = this.getSupportedResult.get(id);
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
          this.logger.error2(`client[${this.id}]: getSupported timeout`);
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
    if (this.isAlive === false) {
      this.closeConnection();
      return;
    }

    this.logger.debug(`client[${this.id}]: ping`);
    this.isAlive = false;
    this.ws.ping();
  }

}
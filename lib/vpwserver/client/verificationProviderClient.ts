import { optional } from '@flarenetwork/mcc';
import { any } from 'hardhat/internal/core/params/argumentTypes';
import WebSocket from 'ws';
import { AttLogger, getGlobalLogger } from '../../utils/logger';
import { sleepms } from '../../utils/utils';
import { Verification, VerificationStatus } from '../../verification/attestation-types/attestation-types';
import { VerificationResult } from '../provider/verificationProvider';


export class VerificationClientOptions {
  @optional() port: number = 8088;
  @optional() connectionTimeoutMS = 5000;
  @optional() verificationTimeoutMS = 5000;

}


export class VerificationClient {

  logger: AttLogger = getGlobalLogger();

  ws: WebSocket = null;

  connected = false;

  nextId = 1000;

  clientOptions: VerificationClientOptions;

  //verificationResult = new Map<number, VerificationResult>();
  verificationResult = new Map<number, Verification<any,any>>();

  async connect(address: string, key: string, clientOptions: VerificationClientOptions = null) {

    this.clientOptions = clientOptions ? clientOptions : new VerificationClientOptions();

    this.ws = new WebSocket(`wss://${address}:${this.clientOptions.port}/api/v1/verification/connect?auth=${key}`, {
      protocolVersion: 8,
      rejectUnauthorized: false
    });

    const me = this;

    this.ws.on('open', function open() {
      me.logger.debug2( `verification client connected`);
      me.connected = true;
    });

    this.ws.on('message', function message(data) {
      me.processMessage(data);
    });

    return new Promise(async (resolve, reject) => {

      let timeout = 0;
      while (!this.connected) {
        await sleepms(100);

        if (++timeout * 100 > this.clientOptions.connectionTimeoutMS) {
          this.logger.error2(`connection timeout`);
          reject("timeout");
          return;
        }
      }

      resolve(true);
    });
  }

  processMessage(data0: any): boolean {
    const data = `${data0}`;
    const args = data.split('\t');

    if (args[0] === `connected`) {
      if (args.length != 2) { this.logger.error(`processMessage: invalid argument count '${data}'`); return false; }


      return true;
    }

    if (args[0] === `verificationResult`) {
      if (args.length != 6) { this.logger.error(`processMessage: invalid argument count '${data}'`); return false; }

      //this.verificationResult.set(parseInt( args[1] ) , new VerificationResult( VerificationStatus[args[2]], args[3]));


      //const res = (Verification<any,any>)JSON.parse( args[3] );
      const res = JSON.parse( args[3] );

      this.verificationResult.set(parseInt( args[1] ) , res );

      return true;
    }

    this.logger.error(`processMessage: unknown message '${data}'`);

    return false;

  }

  async verify(roundId: number, request: string): Promise<Verification<any,any>> {
    const id = this.nextId++;

    this.logger.debug2(`verify id=${id} roundId=${roundId} request='${request}'`);

    this.ws.send(`verify:${id}:${roundId}:${request}`);

    return new Promise(async (resolve, reject) => {

      let timeout = 0;
      while ( true ) {

        let res = this.verificationResult.get( id );

        if( res ) {
          resolve(res);
          return;
        }

        await sleepms(100);

        if( ++timeout * 100 > this.clientOptions.connectionTimeoutMS ) {
          this.logger.error2(`verify timeout`);
          reject("timeout");
          return;
        }
      }
    });
  }

  disconnect() {
    if (!this.ws) return;

    this.ws.close();
    this.ws = null;
  }

}
import { optional } from '@flarenetwork/mcc';

export class WsClientOptions {
   @optional() port: number = 9500;
   @optional() connectionTimeoutMS = 5000;
   @optional() verificationTimeoutMS = 5000;
   @optional() checkAliveIntervalMs = 5000;
}

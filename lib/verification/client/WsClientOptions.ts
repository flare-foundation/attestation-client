import { optional } from '@flarenetwork/mcc';

export class WsClientOptions {
   url: string = `ws://localhost:9500?apiKey=7890`;
   @optional() connectionTimeoutMS = 5000;
   @optional() verificationTimeoutMS = 5000;
   @optional() checkAliveIntervalMs = 5000;
}

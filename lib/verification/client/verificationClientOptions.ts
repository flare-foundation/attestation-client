import { optional } from '@flarenetwork/mcc';

export class VerificationClientOptions {
   @optional() port: number = 8088;
   @optional() connectionTimeoutMS = 5000;
   @optional() verificationTimeoutMS = 5000;
   @optional() checkAliveIntervalMs = 5000;
}

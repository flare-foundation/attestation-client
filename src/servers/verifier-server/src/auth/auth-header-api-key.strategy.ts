import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { VerifierConfigurationService } from '../services/verifier-configuration.service';

@Injectable()
export class HeaderApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
   constructor(
      @Inject("VERIFIER_CONFIG") private config: VerifierConfigurationService
   ) {
      super({ header: 'X-API-KEY', prefix: '' },
         true,
         async (apiKey, done) => {
            return this.validate(apiKey, done);
         });
   }

   public validate(apiKey: string, done: (error: Error, data) => {}) {
      if (this.config?.config?.apiKeys?.find(x => x.apiKey === apiKey)) {
         done(null, true);
      }
      done(new UnauthorizedException(), null);
   }
}
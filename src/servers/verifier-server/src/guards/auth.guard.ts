
import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { VerifierConfigurationService } from '../services/verifier-configuration.service';

@Injectable()
export class AuthGuard implements CanActivate {

   constructor(
      @Inject("VERIFIER_CONFIG") private config: VerifierConfigurationService
   ) {
   }

   canActivate(
      context: ExecutionContext,
   ): boolean | Promise<boolean> | Observable<boolean> {
      const request = context.switchToHttp().getRequest();
      let apiKey = request.body.apiKey;
      return !!this.config.config.apiKeys.find(x => x.apiKey === apiKey);
   }
}

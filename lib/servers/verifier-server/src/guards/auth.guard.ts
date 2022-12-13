
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { VerifierConfigurationService } from '../services/verifier-configuration.service';

@Injectable()
export class AuthGuard implements CanActivate {

   constructor(
      private config: VerifierConfigurationService
   ) {
   }

   canActivate(
      context: ExecutionContext,
   ): boolean | Promise<boolean> | Observable<boolean> {
      const request = context.switchToHttp().getRequest();
      let apiKey = request.body.apiKey;
      return !!this.config.wsServerCredentials.apiKeys.find(x => x.apiKey === apiKey);
   }
}

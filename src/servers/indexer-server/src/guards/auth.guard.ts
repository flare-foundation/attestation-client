
import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IndexerServerConfigurationService } from '../services/indexer-server-configuration.service';

@Injectable()
export class AuthGuard implements CanActivate {

   constructor(
      @Inject("SERVER_CONFIG") private config: IndexerServerConfigurationService
   ) {
   }

   canActivate(
      context: ExecutionContext,
   ): boolean | Promise<boolean> | Observable<boolean> {
      const request = context.switchToHttp().getRequest();
      let apiKey = request.body.apiKey;
      return !!this.config.serverCredentials.apiKeys.find(x => x.apiKey === apiKey);
   }
}

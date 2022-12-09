
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { WSServerConfigurationService } from '../../../common/src';

@Injectable()
export class AuthGuard implements CanActivate {

   constructor(
      private config: WSServerConfigurationService
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

import { Injectable } from '@nestjs/common';
import { WSServerConfigurationService } from '../../../common/src';

@Injectable()
export class WsCommandProcessorService {

  constructor(
    private config: WSServerConfigurationService,
  ) { }

  public mirrorResponse(data: any) {
    let response = {
      status: "OK",
      data
    };
    return response;
  }

  // public supportedAttestationTypes(): [] {
  //   return this.config.wsServerConfiguration.sourceId;
  // }

}

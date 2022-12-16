import { Injectable } from '@nestjs/common';
import { VerifierConfigurationService } from './verifier-configuration.service';

@Injectable()
export class WsCommandProcessorService {

  constructor(
    private config: VerifierConfigurationService,
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

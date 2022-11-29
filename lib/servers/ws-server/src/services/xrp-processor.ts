import { Injectable } from '@nestjs/common';
import { getAttestationTypeAndSource } from '../../../../verification/generated/attestation-request-parse';
import { AttestationProviderConfig, WSServerConfigurationService } from '../../../common/src';

@Injectable()
export class XRPProcessorService {

  constructor(
  ) {}

  public async verify(data: string) {
    return `Hello world ${data}`    
  }
  
}

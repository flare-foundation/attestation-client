import { Injectable } from '@nestjs/common';
import { AttestationRequest } from '../../../../verification/attestation-types/attestation-types';
import { getAttestationTypeAndSource } from '../../../../verification/generated/attestation-request-parse';
import { AttestationProviderConfig, WSServerConfigurationService } from '../../../common/src';

@Injectable()
export class XRPProcessorService {

  constructor(
  ) {}

  public async verify(attestationRequest: AttestationRequest) {
    return `Hello world ${data}`    
  }
  
}

import { AttestationRequest, Verification } from '../../../../../verification/attestation-types/attestation-types';

export abstract class VerifierProcessor {
  public abstract verify(attestationRequest: AttestationRequest): Promise<Verification<any, any>>;
}

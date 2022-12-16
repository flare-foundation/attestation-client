import { AttestationRequest, Verification } from '../../../../../verification/attestation-types/attestation-types';
import { getAttestationTypeAndSource } from '../../../../../verification/generated/attestation-request-parse';
import { getAttestationTypeName } from '../../../../../verification/generated/attestation-types-enum';
import { getSourceName } from '../../../../../verification/sources/sources';

export abstract class VerifierProcessor {
  public abstract verify(attestationRequest: AttestationRequest): Promise<Verification<any, any>>;
  public abstract supportedAttestationTypes(): string[];
  public abstract supportedSource(): string;

  public assertIsSupported(attestationRequest: AttestationRequest) {
    if (process.env.IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST) {
      return;
    }
    let { attestationType, sourceId } = getAttestationTypeAndSource(attestationRequest.request);
    if (this.supportedSource() !== getSourceName(sourceId)) {
      throw new Error(`Unsupported source '${getSourceName(sourceId)}'. Verifier supports '${this.supportedSource()}'`);
    }
    let attTypeName = getAttestationTypeName(attestationType);
    if (this.supportedAttestationTypes().indexOf(attTypeName) < 0) {
      throw new Error(`Unsupported attestation type '${attTypeName}'. Supported types for verifier '${this.supportedSource()}': ${this.supportedAttestationTypes().join(", ")}`);
    }
  }

}

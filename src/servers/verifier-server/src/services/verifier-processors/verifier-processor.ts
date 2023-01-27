import { AttestationRequest, MIC_SALT, Verification } from "../../../../../verification/attestation-types/attestation-types";
import { hashPayment } from "../../../../../verification/generated/attestation-hash-utils";
import { encodeRequest } from "../../../../../verification/generated/attestation-request-encode";
import { getAttestationTypeAndSource } from "../../../../../verification/generated/attestation-request-parse";
import { ARType } from "../../../../../verification/generated/attestation-request-types";
import { getAttestationTypeName } from "../../../../../verification/generated/attestation-types-enum";
import { getSourceName } from "../../../../../verification/sources/sources";

export abstract class VerifierProcessor {
  public abstract verify(attestationRequest: AttestationRequest): Promise<Verification<any, any>>;
  public abstract supportedAttestationTypes(): string[];
  public abstract supportedSource(): string;
  public prepareRequest(request: ARType): Promise<Verification<any, any>> {
    return this.verify({ request: encodeRequest(request) });
  }

  public async getMessageIntegrityCheck(request: ARType): Promise<string> {
    const data = await this.verify({ request: encodeRequest(request) });
    const integrity = hashPayment(data.request, data.response, MIC_SALT);
    return integrity;
  }

  public async getAttestationData(request: ARType): Promise<string> {
    const data = await this.verify({ request: encodeRequest(request) });
    const integrity = hashPayment(data.request, data.response, MIC_SALT);
    request.messageIntegrityCode = integrity;
    return encodeRequest(request);
  }

  public assertIsSupported(attestationRequest: AttestationRequest) {
    if (process.env.NODE_ENV === "development" && process.env.TEST_IGNORE_SUPPORTED_ATTESTATION_CHECK_TEST) {
      return;
    }
    let { attestationType, sourceId } = getAttestationTypeAndSource(attestationRequest.request);
    if (this.supportedSource() !== getSourceName(sourceId)) {
      throw new Error(`Unsupported source '${getSourceName(sourceId)}'. Verifier supports '${this.supportedSource()}'`);
    }
    let attTypeName = getAttestationTypeName(attestationType);
    if (this.supportedAttestationTypes().indexOf(attTypeName) < 0) {
      throw new Error(
        `Unsupported attestation type '${attTypeName}'. Supported types for verifier '${this.supportedSource()}': ${this.supportedAttestationTypes().join(
          ", "
        )}`
      );
    }
  }
}

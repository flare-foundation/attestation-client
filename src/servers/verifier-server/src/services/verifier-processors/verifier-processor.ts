import { AttestationRequest, MIC_SALT, Verification, VerificationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { dataHash } from "../../../../../verification/generated/attestation-hash-utils";
import { encodeRequest } from "../../../../../verification/generated/attestation-request-encode";
import { getAttestationTypeAndSource } from "../../../../../verification/generated/attestation-request-parse";
import { getAttestationTypeName } from "../../../../../verification/generated/attestation-types-enum";
import { getSourceName } from "../../../../../verification/sources/sources";
import { DHType } from "../../dtos/v-hash-types.dto";
import { ARType } from "../../dtos/v-request-types.dto";

export abstract class VerifierProcessor {
  public abstract verify(attestationRequest: AttestationRequest): Promise<Verification<ARType, DHType>>;
  public abstract supportedAttestationTypes(): string[];
  public abstract supportedSource(): string;

  //This is obsolete. It is the same as the getAttestationData but without MIC
  public async prepareRequest(request: ARType): Promise<Verification<ARType, DHType>> {
    return this.verify({ request: encodeRequest(request) });
  }

  /**
   * @returns the Message Integrity check for  @param request
   */
  public async getMessageIntegrityCheck(request: ARType): Promise<string> {
    const data = await this.verify({ request: encodeRequest(request) });
    if (data.status !== VerificationStatus.OK) {
      // TODO: This should be made more stable
      return data.status;
    }
    const integrity = dataHash(data.request, data.response, MIC_SALT);
    return integrity;
  }

  /**
   *
   * Adds MIC to @param request and encodes it
   * @returns
   */
  public async getAttestationData(request: ARType): Promise<string> {
    const data = await this.verify({ request: encodeRequest(request) });
    if (data.status !== VerificationStatus.OK) {
      // TODO: This should be made more stable
      return data.status;
    }
    const integrity = dataHash(data.request, data.response, MIC_SALT);
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

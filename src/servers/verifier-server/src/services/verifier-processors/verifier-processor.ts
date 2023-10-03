import { AttestationResponse } from "../../../../../external-libs/AttestationResponse";
import { ARBase } from "../../../../../external-libs/interfaces";

export abstract class VerifierProcessor<RES> {
  public abstract verifyRequest(request: ARBase): Promise<AttestationResponse<RES>>;
}

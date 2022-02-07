import { genericReturnWithStatus } from "../../../../utils/utils";
import { ChainVerification, DataAvailabilityProof, TransactionAttestationRequest, VerificationStatus, VerificationTestOptions } from "../../../attestation-types";

export function verifyBlockHeightUtxo(
  attRequest: TransactionAttestationRequest,
  availabilityProof: DataAvailabilityProof,  
  testOptions?: VerificationTestOptions
): ChainVerification {
  let RET = (status: VerificationStatus) => genericReturnWithStatus({}, attRequest, status, availabilityProof);
  if(availabilityProof.hash) {
    
    // // check against instructions
    // if (!instructionsCheck(availabilityProof, attRequest)) {
    //   return RET(VerificationStatus.INSTRUCTIONS_DO_NOT_MATCH);
    // }

    return RET(VerificationStatus.OK);
  }
  return RET(VerificationStatus.BLOCKHASH_DOES_NOT_EXIST)  
}

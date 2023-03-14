import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VerificationStatus } from "../../../../verification/attestation-types/attestation-types";
import { DHTypeArray } from "../../../../verification/generated/attestation-hash-types";
import { ARTypeArray } from "../../../../verification/generated/attestation-request-types";
import { ApiPropertyUnion } from "../../../common/src/utils/open-api-utils";

/**
 * DTO Object returned after attestation request verification.
 * If status is 'OK' then parameters @param hash, @param request and @param response appear
 * in the full response.
 */
export class APIVerification<R, T> {
   /**
    * Hash of the attestation as included in Merkle tree.
    */
   @ApiPropertyOptional()
   hash?: string;
   /**
    * Parsed attestation request.
    */
   @ApiPropertyUnion(ARTypeArray)
   request?: R;
   /**
    * Attestation response.
    */
   @ApiPropertyUnion(DHTypeArray)
   response?: T;
   /**
    * Verification status. 
    */
   @ApiProperty({enum: VerificationStatus})
   status: VerificationStatus;
 }
 
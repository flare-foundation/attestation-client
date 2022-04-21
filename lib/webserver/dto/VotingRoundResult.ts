// import { DHType } from "../../verification/generated/attestation-hash-types";
// import { ARType } from "../../verification/generated/attestation-request-types";

export interface VotingRoundResult {
   roundId: number;
   hash: string;
   // tsoa problems with going deep into types.
   // request: ARType;
   // response: DHType; 
   request: any;
   response: any; 

}

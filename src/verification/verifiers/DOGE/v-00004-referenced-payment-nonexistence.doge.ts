//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import {
  ARReferencedPaymentNonexistence,
  AttestationDefinitionStore,
  BN,
  DHReferencedPaymentNonexistence,
  IndexedQueryManager,
  MCC,
  randSol,
  Verification,
  VerificationStatus,
  Web3,
} from "./0imports";
import { DogeTransaction } from "@flarenetwork/mcc";
import { verifyReferencedPaymentNonExistence } from "../../verification-utils/generic-chain-verifications";

const web3 = new Web3();

export async function verifyReferencedPaymentNonexistenceDOGE(
  defStore: AttestationDefinitionStore,
  client: MCC.DOGE,
  attestationRequest: string,
  indexer: IndexedQueryManager
): Promise<Verification<ARReferencedPaymentNonexistence, DHReferencedPaymentNonexistence>> {
  const request = defStore.parseRequest(attestationRequest) as ARReferencedPaymentNonexistence;

  //-$$$<start> of the custom code section. Do not change this comment.

  const result = await verifyReferencedPaymentNonExistence(DogeTransaction, request, indexer);
  if (result.status != VerificationStatus.OK) {
    return { status: result.status };
  }

  const response = result.response;

  //-$$$<end> of the custom section. Do not change this comment.

  const hash = defStore.dataHash(request, response);

  return {
    hash,
    request,
    response,
    status: VerificationStatus.OK,
  };
}

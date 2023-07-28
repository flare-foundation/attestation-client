//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARPayment, AttestationDefinitionStore, BN, DHPayment, IndexedQueryManager, MCC, randSol, Verification, VerificationStatus, Web3 } from "./0imports";
import { BtcTransaction } from "@flarenetwork/mcc";
import { verifyPayment } from "../../verification-utils/generic-chain-verifications";

const web3 = new Web3();

export async function verifyPaymentBTC(
  defStore: AttestationDefinitionStore,
  client: MCC.BTC,
  attestationRequest: string,
  indexer: IndexedQueryManager
): Promise<Verification<ARPayment, DHPayment>> {
  const request = defStore.parseRequest(attestationRequest) as ARPayment;

  //-$$$<start> of the custom code section. Do not change this comment.

  const result = await verifyPayment(BtcTransaction, request, indexer, client);
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

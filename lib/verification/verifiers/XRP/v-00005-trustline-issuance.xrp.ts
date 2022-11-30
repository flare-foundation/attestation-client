//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import {
  ARTrustlineIssuance,
  Attestation,
  BN,
  DHTrustlineIssuance,
  hashTrustlineIssuance,
  IndexedQueryManager,
  MCC,
  parseRequest,
  randSol,
  Verification,
  VerificationStatus,
  Web3,
} from "./0imports";

const web3 = new Web3();

export async function verifyTrustlineIssuanceXRP(
  client: MCC.XRP,
  attestation: Attestation,
  indexer: IndexedQueryManager,
  recheck = false
): Promise<Verification<ARTrustlineIssuance, DHTrustlineIssuance>> {
  const request = parseRequest(attestation.data.request) as ARTrustlineIssuance;
  const roundId = attestation.roundId;
  const numberOfConfirmations = attestation.numberOfConfirmationBlocks;

  //-$$$<start> of the custom code section. Do not change this comment.

  // TYPE THE CODE HERE

  //-$$$<end> of the custom section. Do not change this comment.

  const response = {
    tokenCurrencyCode: randSol(request, "tokenCurrencyCode", "bytes32") as string,
    tokenValueNominator: randSol(request, "tokenValueNominator", "uint256") as BN,
    tokenValueDenominator: randSol(request, "tokenValueDenominator", "uint256") as BN,
    tokenIssuer: randSol(request, "tokenIssuer", "bytes32") as string,
  } as DHTrustlineIssuance;

  const hash = hashTrustlineIssuance(request, response);

  return {
    hash,
    request,
    response,
    status: VerificationStatus.OK,
  };
}

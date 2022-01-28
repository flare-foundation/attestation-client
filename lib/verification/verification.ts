
import { ChainType, toNumber } from "flare-mcc";
import { NormalizedTransactionData, TransactionAttestationRequest, VerificationStatus, VerificationTestOptions } from "./attestation-types";
import { verififyAttestationUtxo } from "./chains/UTXO/verify-attestation.utxo";
import { verififyAttestationXRP } from "./chains/XRP/verify-attestation.xrp";

// Generic
// Add here specific calls for verification
export async function verifyTransactionAttestation(client: any, request: TransactionAttestationRequest, testOptions?: VerificationTestOptions) {
  if (!client) {
    throw new Error("Missing client!");
  }

  // performance test simulation

  // await sleep(500);

  // return {
  //   chainId: toBN(request.chainId),
  //   attestationType: request.attestationType!,
  //   verificationStatus: VerificationStatus.OK,
  //   // utxo: attRequest.utxo,
  // } as NormalizedTransactionData;

  // if (!(request.attestationType === AttestationType.Transaction || request.attestationType === AttestationType.FassetPaymentProof)) {
  //     throw new Error("Wrong attestation Type")
  // }
  let chainId = toNumber(request.chainId) as ChainType;
  switch (chainId) {
    case ChainType.BTC:
    case ChainType.LTC:
    case ChainType.DOGE:
      return verififyAttestationUtxo(client, request, testOptions);
    case ChainType.XRP:
      return verififyAttestationXRP(client, request, testOptions);
    default:
      throw new Error("Wrong chain id!");
  }
}

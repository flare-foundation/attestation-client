import { ChainType } from "../MCC/types";
import { toNumber } from "../MCC/utils";
import { TransactionAttestationRequest, VerificationTestOptions } from "./attestation-types";
import { verififyAttestationUtxo } from "./chains/UTXO";
import { verififyAttestationXRP } from "./chains/XRP";

// Generic
// Add here specific calls for verification
export async function verifyTransactionAttestation(client: any, request: TransactionAttestationRequest, testOptions?: VerificationTestOptions) {
  if (!client) {
    throw new Error("Missing client!");
  }
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

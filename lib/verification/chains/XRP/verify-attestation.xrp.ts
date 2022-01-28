import { AdditionalTransactionDetails, ChainType, unPrefix0x, toNumber, RPCInterface } from "flare-mcc";
import { TxResponse } from "xrpl";
import { AttestationType, NormalizedTransactionData, TransactionAttestationRequest, VerificationTestOptions } from "../../attestation-types";
import { numberOfConfirmations } from "../../confirmations";
import { verifyDecreaseBalanceXRP } from "./attestation-types/decrease-balance.xrp";
import { verifyOneToOneXRP } from "./attestation-types/labeled-to-one-payment.xrp";

////////////////////////////////////////////////////////////////////////////////////////
// Verification
////////////////////////////////////////////////////////////////////////////////////////

export async function verififyAttestationXRP(client: RPCInterface, attRequest: TransactionAttestationRequest, testOptions?: VerificationTestOptions) {
  try {
    let txResponse = (await client.getTransaction(unPrefix0x(attRequest.id))) as TxResponse;
    let additionalData = await client.getAdditionalTransactionDetails({
      transaction: txResponse,
      confirmations: numberOfConfirmations(toNumber(attRequest.chainId) as ChainType),
      getDataAvailabilityProof: true, // should be always true as the data availablity proof is the hash of the next block
    });
    return verifyXrp(additionalData, attRequest, testOptions);
  } catch (error) {
    // TODO: handle error
    console.log(error);
    return {} as any;
  }
}

export function verifyXrp(
  additionalData: AdditionalTransactionDetails,
  attRequest: TransactionAttestationRequest,
  testOptions?: VerificationTestOptions
): NormalizedTransactionData {
  switch (attRequest.attestationType) {
    case AttestationType.LabeledToOnePayment:
      return verifyOneToOneXRP(additionalData, attRequest, testOptions);
    case AttestationType.BalanceDecreasingPayment:
      return verifyDecreaseBalanceXRP(additionalData, attRequest, testOptions);
    default:
      throw new Error(`Invalid attestation type ${attRequest.attestationType}`);
  }
}

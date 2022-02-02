import { toNumber, unPrefix0x, AdditionalTransactionDetails, ChainType, IUtxoBlockRes, IUtxoGetTransactionRes, RPCInterface, prefix0x } from "flare-mcc";
import { genericReturnWithStatus } from "../../../utils/utils";
import { AttestationType, DataAvailabilityProof, NormalizedTransactionData, TransactionAttestationRequest, VerificationStatus, VerificationTestOptions } from "../../attestation-types";
import { numberOfConfirmations } from "../../confirmations";
import { verifyDecreaseBalanceUtxo } from "./attestation-types/decrease-balance.utxo";
import { verifyPaymentUtxo } from "./attestation-types/payment.utxo";

////////////////////////////////////////////////////////////////////////////////////////
// Verification
////////////////////////////////////////////////////////////////////////////////////////

export async function verififyAttestationUtxo(client: RPCInterface, attRequest: TransactionAttestationRequest, testOptions?: VerificationTestOptions) {
  let txResponse = await client.getTransaction(unPrefix0x(attRequest.id), { verbose: true }) as IUtxoGetTransactionRes;

  async function getAdditionalData() {
    return await client
      .getAdditionalTransactionDetails(txResponse)
      .catch((error: any) => {
        throw error;
      });
  }

  async function getAvailabilityProof() {
    // Try to obtain the hash of data availability proof.
    let confirmationBlock = (await client.getBlock(unPrefix0x(attRequest.dataAvailabilityProof)).catch((error: any) => {
      throw error;
    })) as IUtxoBlockRes;
    return {
      hash: prefix0x(confirmationBlock.hash),
      blockNumber: confirmationBlock.height
    } as DataAvailabilityProof;
  }

  let [additionalData, dataAvailability] = await Promise.all([
    getAdditionalData(),
    getAvailabilityProof(),
  ])

  // Test simulation of "too early check"
  let testFailProbability = testOptions?.testFailProbability || 0;
  if (testFailProbability > 0) {
    if (Math.random() < testFailProbability) {
      return genericReturnWithStatus(additionalData, attRequest, VerificationStatus.RECHECK_LATER);
    }
  }

  // verify
  return verifyUtxo(additionalData, dataAvailability!, attRequest, testOptions);
}

export function verifyUtxo(
  additionalData: AdditionalTransactionDetails,
  dataAvailability: DataAvailabilityProof,
  attRequest: TransactionAttestationRequest,
  testOptions?: VerificationTestOptions
): NormalizedTransactionData {
  switch (attRequest.attestationType) {
    case AttestationType.Payment:
      return verifyPaymentUtxo(additionalData, dataAvailability, attRequest, testOptions);
    case AttestationType.BalanceDecreasingPayment:
      return verifyDecreaseBalanceUtxo(additionalData, dataAvailability, attRequest, testOptions);
    default:
      throw new Error(`Invalid attestation type ${attRequest.attestationType}`);
  }
}

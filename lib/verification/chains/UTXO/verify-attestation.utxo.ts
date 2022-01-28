
import { toNumber, unPrefix0x, AdditionalTransactionDetails, ChainType, IUtxoBlockRes, IUtxoGetTransactionRes, RPCInterface } from "flare-mcc";
import { AttestationType, NormalizedTransactionData, TransactionAttestationRequest, VerificationTestOptions } from "../../attestation-types";
import { numberOfConfirmations } from "../../confirmations";
import { verifyDecreaseBalanceUtxo } from "./attestation-types/decrease-balance.utxo";
import { verifyOneToOneUtxo } from "./attestation-types/one-to-one.utxo";

////////////////////////////////////////////////////////////////////////////////////////
// Verification
////////////////////////////////////////////////////////////////////////////////////////

export async function verififyAttestationUtxo(client: RPCInterface, attRequest: TransactionAttestationRequest, testOptions?: VerificationTestOptions) {
  let txResponse = (await client.getTransaction(unPrefix0x(attRequest.id), { verbose: true }).catch((error: any) => {
    throw error;
  })) as IUtxoGetTransactionRes;
  async function getAdditionalData() {
    return await client
      .getAdditionalTransactionDetails({
        transaction: txResponse,
        confirmations: numberOfConfirmations(toNumber(attRequest.chainId) as ChainType),
        getDataAvailabilityProof: !!testOptions?.getAvailabilityProof,
      })
      .catch((error: any) => {
        throw error;
      });
  }

  async function getAvailabilityProof() {
    // Try to obtain the hash of data availability proof.
    if (!testOptions?.getAvailabilityProof) {
      try {
        let confirmationBlock = (await client.getBlock(attRequest.dataAvailabilityProof).catch((error: any) => {
          throw error;
        })) as IUtxoBlockRes;
        return [confirmationBlock.hash, confirmationBlock.height];
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  }

  let [additionalData, confirmationData] = await Promise.all([
    getAdditionalData().catch((error: any) => {
      throw error;
    }),
    getAvailabilityProof().catch((error: any) => {
      throw error;
    }),
  ]).catch((error: any) => {
    throw error;
  });
  // set up the verified
  if (!testOptions?.getAvailabilityProof) {
    // should be set by the above verification either to the same hash, which means that block exists or undefined otherwise.
    additionalData.dataAvailabilityProof = confirmationData![0] as string;
    additionalData.dataAvailabilityBlockOffset = (confirmationData![1] as number) - additionalData.blockNumber.toNumber();
  }
  return verifyUtxo(additionalData, attRequest, testOptions);
}

export function verifyUtxo(
  additionalData: AdditionalTransactionDetails,
  attRequest: TransactionAttestationRequest,
  testOptions?: VerificationTestOptions
): NormalizedTransactionData {
  switch (attRequest.attestationType) {
    case AttestationType.OneToOnePayment:
      return verifyOneToOneUtxo(additionalData, attRequest, testOptions);
    case AttestationType.BalanceDecreasingProof:
      return verifyDecreaseBalanceUtxo(additionalData, attRequest, testOptions);
    default:
      throw new Error(`Invalid attestation type ${attRequest.attestationType}`);
  }
}

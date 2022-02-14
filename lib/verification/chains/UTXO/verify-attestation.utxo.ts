import { AdditionalTransactionDetails, IUtxoBlockRes, IUtxoGetTransactionRes, prefix0x, RPCInterface, unPrefix0x } from "flare-mcc";
import { genericReturnWithStatus } from "../../../utils/utils";
import {
  AttestationType, ChainVerification, DataAvailabilityProof, TransactionAttestationRequest,
  VerificationStatus,
  VerificationTestOptions
} from "../../attestation-types";
import { verifyBlockHeightUtxo } from "./attestation-types/block-height.utxo";
import { verifyDecreaseBalanceUtxo } from "./attestation-types/decrease-balance.utxo";
import { verifyPaymentUtxo } from "./attestation-types/payment.utxo";

////////////////////////////////////////////////////////////////////////////////////////
// Verification
////////////////////////////////////////////////////////////////////////////////////////

export async function verififyAttestationUtxo(client: RPCInterface, attRequest: TransactionAttestationRequest, testOptions?: VerificationTestOptions) {
  let txResponse: IUtxoGetTransactionRes | undefined;;
  let additionalData: AdditionalTransactionDetails | undefined;
  let dataAvailability: DataAvailabilityProof | undefined;

  switch (attRequest.attestationType) {
    case AttestationType.Payment:
    case AttestationType.BalanceDecreasingPayment:
      // txResponse = (await client.getTransaction(unPrefix0x(attRequest.id), { verbose: true })) as IUtxoGetTransactionRes;

      // [additionalData, dataAvailability] = await Promise.all([
      //   client.getAdditionalTransactionDetails(txResponse),
      //   getAvailabilityProof(client, attRequest)
      // ]);
      break;
    case AttestationType.BlockHeightExistence:
      dataAvailability = await getAvailabilityProof(client, attRequest);
      break;
    default:
      throw new Error("Invalid AttestationType")
  }
  // Verification
  let verification = verifyUtxo(attRequest, additionalData, dataAvailability, testOptions);

  // Test simulation of "too early check"
  let testFailProbability = testOptions?.testFailProbability || 0;
  if (testFailProbability > 0) {
    if (Math.random() < testFailProbability) {
      return genericReturnWithStatus(additionalData! || {}, attRequest, VerificationStatus.RECHECK_LATER);
    }
  }

  return verification;
}

async function getAvailabilityProof(client: RPCInterface, attRequest: TransactionAttestationRequest): Promise<DataAvailabilityProof> {
  // Try to obtain the hash of data availability proof.
  let confirmationBlock = await client.getBlock(unPrefix0x(attRequest.dataAvailabilityProof)) as IUtxoBlockRes;
  // TODO: check that MCC returns null on not found
  if (confirmationBlock) {
    return {
      hash: prefix0x(confirmationBlock.hash),
      blockNumber: confirmationBlock.height,
    } as DataAvailabilityProof;
  }
  return {} as DataAvailabilityProof;
}

export function verifyUtxo(
  attRequest: TransactionAttestationRequest,
  additionalData?: AdditionalTransactionDetails,
  dataAvailability?: DataAvailabilityProof,
  testOptions?: VerificationTestOptions
): ChainVerification {
  switch (attRequest.attestationType) {
    case AttestationType.Payment:
      return verifyPaymentUtxo(attRequest, additionalData!, dataAvailability!, testOptions);
    case AttestationType.BalanceDecreasingPayment:
      return verifyDecreaseBalanceUtxo(attRequest, additionalData!, dataAvailability!, testOptions);
    case AttestationType.BlockHeightExistence:
      return verifyBlockHeightUtxo(attRequest, dataAvailability!, testOptions);
    default:
      throw new Error(`Invalid attestation type ${attRequest.attestationType}`);
  }
}

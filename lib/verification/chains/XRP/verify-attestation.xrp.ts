import { AdditionalTransactionDetails, ChainType, unPrefix0x, toNumber, RPCInterface, prefix0x } from "flare-mcc";
import { LedgerResponse, TxResponse } from "xrpl";
import { genericReturnWithStatus } from "../../../utils/utils";
import { AttestationType, DataAvailabilityProof, NormalizedTransactionData, TransactionAttestationRequest, VerificationStatus, VerificationTestOptions } from "../../attestation-types";
import { numberOfConfirmations } from "../../confirmations";
import { verifyDecreaseBalanceXRP } from "./attestation-types/decrease-balance.xrp";
import { verifyPaymentXRP } from "./attestation-types/payment.xrp";

////////////////////////////////////////////////////////////////////////////////////////
// Verification
////////////////////////////////////////////////////////////////////////////////////////

export async function verififyAttestationXRP(
  client: RPCInterface,
  attRequest: TransactionAttestationRequest,
  testOptions?: VerificationTestOptions
) {
  try {
    // get transaction
    let txResponse = (await client.getTransaction(unPrefix0x(attRequest.id))) as TxResponse;

    // get additional data
    let additionalData = await client.getAdditionalTransactionDetails(txResponse);

    // Test simulation of "too early check"
    let testFailProbability = testOptions?.testFailProbability || 0;
    if (testFailProbability > 0) {
      if (Math.random() < testFailProbability) {
        return genericReturnWithStatus(additionalData, attRequest, VerificationStatus.RECHECK_LATER);
      }
    }

    // get data availability proof
    let blockNumber = txResponse.result.ledger_index!;
    let confirmationBlockIndex = blockNumber + numberOfConfirmations(toNumber(attRequest.chainId) as ChainType);

    // TODO: verify should return response, or null in case of no proof or throw exception (needs retry)
    let confirmationBlock = await client.getBlock(confirmationBlockIndex) as LedgerResponse;
    let availabilityProof = {
      hash: prefix0x(confirmationBlock?.result?.ledger_hash),
      blockNumber: confirmationBlock?.result?.ledger_index
    } as DataAvailabilityProof;

    // verify 
    return verifyXrp(additionalData, availabilityProof, attRequest, testOptions);
  } catch (error) {
    // TODO: handle error
    console.log(error);
    return {} as any;
  }
}

export function verifyXrp(
  additionalData: AdditionalTransactionDetails,
  availabilityProof: DataAvailabilityProof,
  attRequest: TransactionAttestationRequest,
  testOptions?: VerificationTestOptions
): NormalizedTransactionData {
  switch (attRequest.attestationType) {
    case AttestationType.Payment:
      return verifyPaymentXRP(additionalData, availabilityProof, attRequest, testOptions);
    case AttestationType.BalanceDecreasingPayment:
      return verifyDecreaseBalanceXRP(additionalData, availabilityProof, attRequest, testOptions);
    default:
      throw new Error(`Invalid attestation type ${attRequest.attestationType}`);
  }
}

import { AdditionalTransactionDetails, ChainType, unPrefix0x, toNumber, RPCInterface, prefix0x } from "flare-mcc";
import { cli } from "winston/lib/winston/config";
import { LedgerResponse, TxResponse } from "xrpl";
import { genericReturnWithStatus } from "../../../utils/utils";
import {
   AttestationType,
   DataAvailabilityProof,
   ChainVerification,
   TransactionAttestationRequest,
   VerificationStatus,
   VerificationTestOptions,
} from "../../attestation-types";
import { numberOfConfirmations } from "../../confirmations";
import { verifyBlockHeightXRP } from "./attestation-types/block-height.xrp";
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
      let txResponse: TxResponse | undefined;
      let additionalData: AdditionalTransactionDetails | undefined;
      let availabilityProof: DataAvailabilityProof | undefined;

      switch (attRequest.attestationType) {
         case AttestationType.Payment:
         case AttestationType.BalanceDecreasingPayment: {
            // get transaction
            txResponse = (await client.getTransaction(unPrefix0x(attRequest.id))) as TxResponse;

            // get additional data
            additionalData = await client.getAdditionalTransactionDetails(txResponse);

            // availability proof
            let blockNumber = txResponse.result.ledger_index!;
            availabilityProof = await getAvailabilityProof(client, attRequest, blockNumber);
            break;
         }
         case AttestationType.BlockHeightExistence: {
            availabilityProof = await getAvailabilityProof(client, attRequest, toNumber(attRequest.blockNumber!)!);
            break;
         }
         default:
            throw new Error("Wrong attestation type")
      }


      // Test simulation of "too early check"
      let testFailProbability = testOptions?.testFailProbability || 0;
      if (testFailProbability > 0) {
         if (Math.random() < testFailProbability) {
            return genericReturnWithStatus(additionalData, attRequest, VerificationStatus.RECHECK_LATER);
         }
      }


      // verify
      return verifyXrp(attRequest, additionalData, availabilityProof, testOptions);
   } catch (error) {
      // TODO: handle error
      console.log(error);
      return {} as any;
   }
}


async function getAvailabilityProof(client: RPCInterface, attRequest: TransactionAttestationRequest, blockNumber: number) {
   // get data availability proof
   let confirmationBlockIndex = blockNumber + numberOfConfirmations(toNumber(attRequest.chainId) as ChainType);

   // TODO: verify should return response, or null in case of no proof or throw exception (needs retry)
   let confirmationBlock = (await client.getBlock(confirmationBlockIndex)) as LedgerResponse;
   let availabilityProof = {
      hash: prefix0x(confirmationBlock?.result?.ledger_hash),
      blockNumber: confirmationBlock?.result?.ledger_index,
   } as DataAvailabilityProof;
   return availabilityProof;
}

export function verifyXrp(
   attRequest: TransactionAttestationRequest,
   additionalData?: AdditionalTransactionDetails,
   dataAvailability?: DataAvailabilityProof,   
   testOptions?: VerificationTestOptions
): ChainVerification {
   switch (attRequest.attestationType) {
      case AttestationType.Payment:
         return verifyPaymentXRP(attRequest, additionalData!, dataAvailability!, testOptions);
      case AttestationType.BalanceDecreasingPayment:
         return verifyDecreaseBalanceXRP(attRequest, additionalData!, dataAvailability!, testOptions);
      case AttestationType.BlockHeightExistence:
         return verifyBlockHeightXRP(attRequest, additionalData, dataAvailability!, testOptions);
      default:
         throw new Error(`Invalid attestation type ${attRequest.attestationType}`);
   }
}

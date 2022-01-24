import BN from "bn.js";
import { AdditionalTransactionDetails, ChainType, IUtxoBlockRes, IUtxoGetTransactionRes, RPCInterface } from "../../MCC/types";
import { toBN, toNumber, unPrefix0x } from "../../MCC/utils";
import { checkDataAvailability } from "../attestation-request-utils";
import { AttestationType, NormalizedTransactionData, TransactionAttestationRequest, VerificationStatus, VerificationTestOptions } from "../attestation-types";
import { numberOfConfirmations } from "../confirmations";

////////////////////////////////////////////////////////////////////////////////////////
// Verification
////////////////////////////////////////////////////////////////////////////////////////

export async function verififyAttestationUtxo(client: RPCInterface, attRequest: TransactionAttestationRequest, testOptions?: VerificationTestOptions) {
    try {
        let txResponse = (await client.getTransaction(unPrefix0x(attRequest.id), { verbose: true })) as IUtxoGetTransactionRes;
        async function getAdditionalData() {
            return await client.getAdditionalTransactionDetails({
                transaction: txResponse,
                confirmations: numberOfConfirmations(toNumber(attRequest.chainId) as ChainType),
                getDataAvailabilityProof: !!testOptions?.getAvailabilityProof
            });
        }

        async function getAvailabilityProof() {
            // Try to obtain the hash of data availability proof.
            if (!testOptions?.getAvailabilityProof) {
                try {
                    let confirmationBlock = await client.getBlock(attRequest.dataAvailabilityProof) as IUtxoBlockRes;
                    return confirmationBlock.hash;
                } catch (e) {
                    return undefined;
                }
            }
            return undefined;
        }

        let [additionalData, confirmationHash] = await Promise.all([getAdditionalData(), getAvailabilityProof()]);
        // set up the verified 
        if (!testOptions?.getAvailabilityProof) {
            // should be set by the above verification either to the same hash, which means that block exists or undefined otherwise.
            additionalData.dataAvailabilityProof = confirmationHash!;
        }
        return checkAndAggregateUtxo(additionalData, attRequest, testOptions);
    } catch (error) {
        // TODO: handle error
        console.log(error);
        return {} as any;
    }
}

function checkAndAggregateToOnePaymentUtxo(
    additionalData: AdditionalTransactionDetails,
    attRequest: TransactionAttestationRequest,
    testOptions?: VerificationTestOptions
): NormalizedTransactionData {
    function genericReturnWithStatus(verificationStatus: VerificationStatus) {
        return {
            chainId: toBN(attRequest.chainId),
            attestationType: attRequest.attestationType!,
            ...additionalData,
            verificationStatus,
            // utxo: attRequest.utxo,
        } as NormalizedTransactionData;
    }

    // Test simulation of "too early check"
    let testFailProbability = testOptions?.testFailProbability || 0;
    if (testFailProbability > 0) {
        if (Math.random() < testFailProbability) {
            return genericReturnWithStatus(VerificationStatus.RECHECK_LATER);
        }
    }

    // check against instructions
    // if (!instructionsCheck(additionalData, attRequest)) {
    //   return genericReturnWithStatus(VerificationStatus.INSTRUCTIONS_DO_NOT_MATCH);
    // }

    // Extract source address
    if (attRequest.utxo === undefined) {
        return genericReturnWithStatus(VerificationStatus.MISSING_IN_UTXO);
    }

    let theSource: string | undefined = undefined;
    let inFunds = toBN(0);
    for (let i = 0; i < additionalData.sourceAddresses.length; i++) {
        let addressList = additionalData.sourceAddresses[i];
        if (addressList.length !== 1) {
            return genericReturnWithStatus(VerificationStatus.UNSUPPORTED_SOURCE_ADDRESS);
        }
        if (addressList[0] === "") {
            return genericReturnWithStatus(VerificationStatus.EMPTY_IN_ADDRESS);
        }
        if (theSource && addressList[0] != theSource) {
            return genericReturnWithStatus(VerificationStatus.NOT_SINGLE_SOURCE_ADDRESS);
        }
        theSource = addressList[0];
        inFunds = inFunds.add((additionalData.spent as BN[])[i]);
    }
    if (!theSource) {
        return genericReturnWithStatus(VerificationStatus.EMPTY_IN_ADDRESS);
    }

    let theDestination: string | undefined = undefined;
    let outFunds = toBN(0);
    let returnedFunds = toBN(0);

    for (let i = 0; i < additionalData.destinationAddresses.length; i++) {
        let addressList = additionalData.destinationAddresses[i];
        if (addressList.length !== 1) {
            return genericReturnWithStatus(VerificationStatus.UNSUPPORTED_DESTINATION_ADDRESS);
        }
        let destAddress = addressList[0];
        if (destAddress === "") {
            return genericReturnWithStatus(VerificationStatus.EMPTY_OUT_ADDRESS);
        }
        let destDelivered = (additionalData.delivered as BN[])[i];
        if (destAddress === theSource) {
            returnedFunds = returnedFunds.add(destDelivered)
        } else {
            if (theDestination && theDestination != destAddress) {
                return genericReturnWithStatus(VerificationStatus.NOT_SINGLE_DESTINATION_ADDRESS);
            }
            theDestination = destAddress;
            outFunds = outFunds.add(destDelivered);
        }
    }
    if (!theDestination && returnedFunds.gt(toBN(0))) {
        theDestination = theSource;
    }

    let newAdditionalData = {
        ...additionalData,
        sourceAddresses: theSource,
        destinationAddresses: theDestination,
        spent: inFunds.sub(returnedFunds),
        delivered: outFunds,
        fee: inFunds.sub(outFunds),
    } as AdditionalTransactionDetails;

    function newGenericReturnWithStatus(verificationStatus: VerificationStatus) {
        return {
            chainId: toBN(attRequest.chainId),
            attestationType: attRequest.attestationType!,
            ...newAdditionalData,
            verificationStatus,
            // utxo: attRequest.utxo,
        } as NormalizedTransactionData;
    }

    // check confirmations
    let dataAvailabilityVerification = checkDataAvailability(newAdditionalData, attRequest);
    if (dataAvailabilityVerification != VerificationStatus.OK) {
        return newGenericReturnWithStatus(dataAvailabilityVerification);
    }

    return newGenericReturnWithStatus(VerificationStatus.OK);
}

function checkAndAggregateDecreaseBalancePaymentUtxo(
    additionalData: AdditionalTransactionDetails,
    attRequest: TransactionAttestationRequest,
    testOptions?: VerificationTestOptions
) {
    function genericReturnWithStatus(verificationStatus: VerificationStatus) {
        return {
            chainId: toBN(attRequest.chainId),
            attestationType: attRequest.attestationType!,
            ...additionalData,
            verificationStatus,
            utxo: attRequest.utxo,
        } as NormalizedTransactionData;
    }

    // Test simulation of "too early check"
    let testFailProbability = testOptions?.testFailProbability || 0;
    if (testFailProbability > 0) {
        if (Math.random() < testFailProbability) {
            return genericReturnWithStatus(VerificationStatus.RECHECK_LATER);
        }
    }

    // check against instructions
    // if (!instructionsCheck(additionalData, attRequest)) {
    //   return genericReturnWithStatus(VerificationStatus.INSTRUCTIONS_DO_NOT_MATCH);
    // }

    // find matching address and calculate funds taken from it
    let sourceIndices: number[] = [];
    let theSource: string | undefined;
    let inFunds = toBN(0);

    if (attRequest.utxo === undefined) {
        return genericReturnWithStatus(VerificationStatus.MISSING_IN_UTXO);
    }
    let inUtxo = toNumber(attRequest.utxo)!;
    if (inUtxo < 0 || inUtxo >= additionalData.sourceAddresses.length) {
        return genericReturnWithStatus(VerificationStatus.WRONG_IN_UTXO);
    }
    let sourceCandidates = additionalData.sourceAddresses[inUtxo!];
    // TODO: handle multisig
    if (sourceCandidates.length != 1) {
        return genericReturnWithStatus(VerificationStatus.UNSUPPORTED_SOURCE_ADDRESS);
    }

    theSource = sourceCandidates[0];

    // Calculate in funds
    for (let i = 0; i < additionalData.sourceAddresses.length; i++) {
        let sources = additionalData.sourceAddresses[i];
        // TODO: Handle multisig addresses
        if (sources.length != 1) {
            continue;
        }
        let aSource = sources[0];
        if (aSource === theSource) {
            sourceIndices.push(i);
            inFunds = inFunds.add((additionalData.spent as BN[])[i]);
        }
    }

    // calculate returned funds
    let returnedFunds = toBN(0);
    for (let i = 0; i < additionalData.destinationAddresses.length; i++) {
        let destination = additionalData.destinationAddresses[i];
        // TODO: handle multisig given source address?
        if (destination.length != 1) {
            continue;
        }
        if (destination[0] === theSource) {
            let destDelivered = (additionalData.delivered as BN[])[i];
            returnedFunds = returnedFunds.add(destDelivered);
        }
    }

    if (returnedFunds.eq(inFunds)) {
        return genericReturnWithStatus(VerificationStatus.FUNDS_UNCHANGED);
    }
    if (returnedFunds.gt(inFunds)) {
        return genericReturnWithStatus(VerificationStatus.FUNDS_INCREASED);
    }

    let newAdditionalData = {
        ...additionalData,
        sourceAddresses: theSource,
        spent: inFunds.sub(returnedFunds),
    } as AdditionalTransactionDetails;

    function newGenericReturnWithStatus(verificationStatus: VerificationStatus) {
        return {
            chainId: toBN(attRequest.chainId),
            attestationType: attRequest.attestationType!,
            ...newAdditionalData,
            verificationStatus,
            utxo: attRequest.utxo,
        } as NormalizedTransactionData;
    }

    // check confirmations
    let dataAvailabilityVerification = checkDataAvailability(newAdditionalData, attRequest);
    if (dataAvailabilityVerification != VerificationStatus.OK) {
        return newGenericReturnWithStatus(dataAvailabilityVerification);
    }

    return newGenericReturnWithStatus(VerificationStatus.OK);
}

function checkAndAggregateUtxo(
    additionalData: AdditionalTransactionDetails,
    attRequest: TransactionAttestationRequest,
    testOptions?: VerificationTestOptions
): NormalizedTransactionData {
    switch (attRequest.attestationType) {
        case AttestationType.FassetPaymentProof:
            return checkAndAggregateToOnePaymentUtxo(additionalData, attRequest, testOptions);
        case AttestationType.BalanceDecreasingProof:
            return checkAndAggregateDecreaseBalancePaymentUtxo(additionalData, attRequest, testOptions);
        default:
            throw new Error(`Invalid attestation type ${attRequest.attestationType}`);
    }
}

////////////////////////////////////////////////////////////////////////////////////////
// Support
////////////////////////////////////////////////////////////////////////////////////////

export function isSupportedTransactionUtxo(transaction: any, attType: AttestationType): boolean {
    return true;
}

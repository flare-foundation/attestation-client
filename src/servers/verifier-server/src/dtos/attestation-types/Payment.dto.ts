//////////////////////////////////////////////////////////////////////////////////////////
/////// THIS CODE IS AUTOGENERATED. DO NOT CHANGE!!!                             /////////
//////////////////////////////////////////////////////////////////////////////////////////
import { ApiProperty, OmitType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    Validate,
    IsBoolean,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    IsDefined,
    IsNotEmptyObject,
    IsObject,
    ValidateNested,
} from "class-validator";

///////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////// CUSTOM VALIDATORS ////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Validator constraint if the given value is a number or 0x-prefixed hexadecimal string.
 */
@ValidatorConstraint({ name: "unsigned-int", async: false })
class IsUnsignedIntLike implements ValidatorConstraintInterface {
    /**
     * Validates if the given value is a string of decimal unsigned number or 0x-prefixed hexadecimal string.
     * @param text
     * @param args
     * @returns
     */
    validate(text: any, _args: ValidationArguments) {
        return typeof text === "string" && (/^0x[0-9a-fA-F]+$/i.test(text) || /^[0-9]+$/i.test(text));
    }

    /**
     * Returns the default error message template.
     * @param args
     * @returns
     */
    defaultMessage(_args: ValidationArguments) {
        return "($property) value ($value) is not a decimal number in string or 0x-prefixed hexadecimal string";
    }
}

/**
 * Validator constraint if the given value is a number or 0x-prefixed hexadecimal string.
 */
@ValidatorConstraint({ name: "signed-int", async: false })
class IsSignedIntLike implements ValidatorConstraintInterface {
    /**
     * Validates if the given value is a number or 0x-prefixed hexadecimal string.
     * @param text
     * @param args
     * @returns
     */
    validate(text: any, _args: ValidationArguments) {
        return typeof text === "string" && (/^-?0x[0-9a-fA-F]+$/i.test(text) || /^-?[0-9]+$/i.test(text));
    }

    /**
     * Returns the default error message template.
     * @param args
     * @returns
     */
    defaultMessage(_args: ValidationArguments) {
        return "($property) value ($value) is not a signed decimal integer in string or signed 0x-prefixed hexadecimal string";
    }
}

/**
 * Validator constraint if the given value is a 0x-prefixed hexadecimal string representing 32 bytes.
 */
@ValidatorConstraint({ name: "hash-32", async: false })
class IsHash32 implements ValidatorConstraintInterface {
    /**
     * Validates if the given value is a 0x-prefixed hexadecimal string representing 32 bytes.
     * @param text
     * @param args
     * @returns
     */
    validate(text: any, _args: ValidationArguments) {
        return typeof text === "string" && /^0x[0-9a-f]{64}$/i.test(text);
    }

    /**
     * Returns the default error message template.
     * @param args
     * @returns
     */
    defaultMessage(_args: ValidationArguments) {
        return "($property) value ($value) is not 0x-prefixed hexadecimal string representing 32 bytes";
    }
}

/**
 * Validator constraint if the given value is a 0x-prefixed hexadecimal string
 */
@ValidatorConstraint({ name: "hash-0x", async: false })
class Is0xHex implements ValidatorConstraintInterface {
    /**
     * Validates if the given value is a 0x-prefixed hexadecimal string
     * @param text
     * @param args
     * @returns
     */
    validate(text: any, _args: ValidationArguments) {
        return typeof text === "string" && /^0x[0-9a-f]+$/i.test(text);
    }

    /**
     * Returns the default error message template.
     * @param args
     * @returns
     */
    defaultMessage(_args: ValidationArguments) {
        return "($property) value ($value) is not 0x-prefixed hexadecimal string";
    }
}

/**
 * Validator constraint if the given value is an EVM address, hence 0x-prefixed hexadecimal string representing 20 bytes.
 */
@ValidatorConstraint({ name: "evm-address", async: false })
class IsEVMAddress implements ValidatorConstraintInterface {
    /**
     * Validates if the given value is an EVM address, hence 0x-prefixed hexadecimal string representing 20 bytes.
     * @param text
     * @param args
     * @returns
     */
    validate(text: any, _args: ValidationArguments) {
        return typeof text === "string" && /^0x[0-9a-f]{40}$/i.test(text);
    }

    /**
     * Returns the default error message template.
     * @param args
     * @returns
     */
    defaultMessage(_args: ValidationArguments) {
        return "($property) value ($value) is not 0x-prefixed hexadecimal string representing 20 bytes (EVM address)";
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////// DTOs /////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Attestation status
 */
export enum AttestationResponseStatus {
    /**
     * Attestation request is valid.
     */
    VALID = "VALID",
    /**
     * Attestation request is invalid.
     */
    INVALID = "INVALID",
    /**
     * Attestation request cannot be confirmed neither rejected by the verifier at the moment.
     */
    INDETERMINATE = "INDETERMINATE",
}

/**
 * Attestation response for specific attestation type (flattened)
 */
export class AttestationResponseDTO_Payment_Response {
    constructor(params: Required<AttestationResponseDTO_Payment_Response>) {
        Object.assign(this, params);
    }

    status: AttestationResponseStatus;

    response?: Payment_Response;
}

export class Payment_ResponseBody {
    constructor(params: Required<Payment_ResponseBody>) {
        Object.assign(this, params);
    }

    /**
     * Number of the block in which the transaction is included.
     */
    @Validate(IsUnsignedIntLike)
    @ApiProperty({ description: `Number of the block in which the transaction is included.`, example: "123" })
    blockNumber: string;

    /**
     * The timestamps of the block in which the transaction is included.
     */
    @Validate(IsUnsignedIntLike)
    @ApiProperty({ description: `The timestamps of the block in which the transaction is included.`, example: "123" })
    blockTimestamp: string;

    /**
     * Standard address hash of the source address.
     */
    @Validate(IsHash32)
    @ApiProperty({ description: `Standard address hash of the source address.`, example: "0x0000000000000000000000000000000000000000000000000000000000000000" })
    sourceAddressHash: string;

    /**
     * Standard address hash of the receiving address. Zero 32-byte string if there is no receivingAddress (if `status` is not success).
     */
    @Validate(IsHash32)
    @ApiProperty({
        description: `Standard address hash of the receiving address. Zero 32-byte string if there is no receivingAddress (if 'status' is not success).`,
        example: "0x0000000000000000000000000000000000000000000000000000000000000000",
    })
    receivingAddressHash: string;

    /**
     * Standard address hash of the intended receiving address. Relevant if the transaction was unsuccessful.
     */
    @Validate(IsHash32)
    @ApiProperty({
        description: `Standard address hash of the intended receiving address. Relevant if the transaction was unsuccessful.`,
        example: "0x0000000000000000000000000000000000000000000000000000000000000000",
    })
    intendedReceivingAddressHash: string;

    /**
     * Amount in minimal units spent by the source address.
     */
    @Validate(IsUnsignedIntLike)
    @ApiProperty({ description: `Amount in minimal units spent by the source address.`, example: "123" })
    spentAmount: string;

    /**
     * Amount in minimal units to be spent by the source address. Relevant if the transaction status is not success.
     */
    @Validate(IsUnsignedIntLike)
    @ApiProperty({
        description: `Amount in minimal units to be spent by the source address. Relevant if the transaction status is not success.`,
        example: "123",
    })
    intendedSpentAmount: string;

    /**
     * Amount in minimal units received by the receiving address.
     */
    @Validate(IsUnsignedIntLike)
    @ApiProperty({ description: `Amount in minimal units received by the receiving address.`, example: "123" })
    receivedAmount: string;

    /**
     * Amount in minimal units intended to be received by the receiving address. Relevant if the transaction was unsuccessful.
     */
    @Validate(IsUnsignedIntLike)
    @ApiProperty({
        description: `Amount in minimal units intended to be received by the receiving address. Relevant if the transaction was unsuccessful.`,
        example: "123",
    })
    intendedReceivedAmount: string;

    /**
     * Identifier of the transaction as defined [here](/specs/attestations/external-chains/standardPaymentReference.md).
     */
    @Validate(IsHash32)
    @ApiProperty({
        description: `Identifier of the transaction as defined [here](/specs/attestations/external-chains/standardPaymentReference.md).`,
        example: "0x0000000000000000000000000000000000000000000000000000000000000000",
    })
    standardPaymentReference: string;

    /**
     * Indicator whether only one source and one receiver are involved in the transaction.
     */
    @IsBoolean()
    @ApiProperty({ description: `Indicator whether only one source and one receiver are involved in the transaction.`, example: true })
    oneToOne: boolean;

    /**
     * Status of the transaction as described [here](/specs/attestations/external-chains/transactions.md#transaction-success-status):
     */
    @Validate(IsUnsignedIntLike)
    @ApiProperty({
        description: `Status of the transaction as described [here](/specs/attestations/external-chains/transactions.md#transaction-success-status):`,
        example: "123",
    })
    status: string;
}
export class Payment_RequestBody {
    constructor(params: Required<Payment_RequestBody>) {
        Object.assign(this, params);
    }

    /**
     * Id of the payment transaction.
     */
    @Validate(IsHash32)
    @ApiProperty({ description: `Id of the payment transaction.`, example: "0x0000000000000000000000000000000000000000000000000000000000000000" })
    transactionId: string;

    /**
     * For UTXO, this is the index of the transaction input with source address. Always 0 for the non-utxo chains.
     */
    @Validate(IsUnsignedIntLike)
    @ApiProperty({ description: `For UTXO, this is the index of the transaction input with source address. Always 0 for the non-utxo chains.`, example: "123" })
    inUtxo: string;

    /**
     * For UTXO, this is the index of the transaction output with receiving address. Always 0 for the non-utxo chains.
     */
    @Validate(IsUnsignedIntLike)
    @ApiProperty({
        description: `For UTXO, this is the index of the transaction output with receiving address. Always 0 for the non-utxo chains.`,
        example: "123",
    })
    utxo: string;
}
export class Payment_Request {
    constructor(params: Required<Payment_Request>) {
        Object.assign(this, params);
    }

    /**
     * Id of the attestation type.
     */
    @Validate(IsHash32)
    @ApiProperty({ description: `Id of the attestation type.`, example: "0x5061796d656e7400000000000000000000000000000000000000000000000000" })
    attestationType: string;

    /**
     * Id of the data source.
     */
    @Validate(IsHash32)
    @ApiProperty({ description: `Id of the data source.`, example: "0x4254430000000000000000000000000000000000000000000000000000000000" })
    sourceId: string;

    /**
     * `MessageIntegrityCode` that is derived from the expected response as defined [here](/specs/attestations/hash-MIC.md#message-integrity-code).
     */
    @Validate(IsHash32)
    @ApiProperty({
        description: `'MessageIntegrityCode' that is derived from the expected response as defined [here](/specs/attestations/hash-MIC.md#message-integrity-code).`,
        example: "0x0000000000000000000000000000000000000000000000000000000000000000",
    })
    messageIntegrityCode: string;

    /**
     * Data defining the request. Type (struct) and interpretation is determined by the `attestationType`.
     */
    @ValidateNested()
    @Type(() => Payment_RequestBody)
    @IsDefined()
    @IsNotEmptyObject()
    @IsObject()
    @ApiProperty({ description: `Data defining the request. Type (struct) and interpretation is determined by the 'attestationType'.` })
    requestBody: Payment_RequestBody;
}
export class Payment_Response {
    constructor(params: Required<Payment_Response>) {
        Object.assign(this, params);
    }

    /**
     * Extracted from the request.
     */
    @Validate(IsHash32)
    @ApiProperty({ description: `Extracted from the request.`, example: "0x5061796d656e7400000000000000000000000000000000000000000000000000" })
    attestationType: string;

    /**
     * Extracted from the request.
     */
    @Validate(IsHash32)
    @ApiProperty({ description: `Extracted from the request.`, example: "0x4254430000000000000000000000000000000000000000000000000000000000" })
    sourceId: string;

    /**
     * The id of the state connector round in which the request was considered.
     */
    @Validate(IsUnsignedIntLike)
    @ApiProperty({ description: `The id of the state connector round in which the request was considered.`, example: "123" })
    votingRound: string;

    /**
     * The lowest timestamp used to generate the response.
     */
    @Validate(IsUnsignedIntLike)
    @ApiProperty({ description: `The lowest timestamp used to generate the response.`, example: "123" })
    lowestUsedTimestamp: string;

    /**
     * Extracted from the request.
     */
    @ValidateNested()
    @Type(() => Payment_RequestBody)
    @IsDefined()
    @IsNotEmptyObject()
    @IsObject()
    @ApiProperty({ description: `Extracted from the request.` })
    requestBody: Payment_RequestBody;

    /**
     * Data defining the response. The verification rules for the construction of the response body and the type are defined per specific `attestationType`.
     */
    @ValidateNested()
    @Type(() => Payment_ResponseBody)
    @IsDefined()
    @IsNotEmptyObject()
    @IsObject()
    @ApiProperty({
        description: `Data defining the response. The verification rules for the construction of the response body and the type are defined per specific 'attestationType'.`,
    })
    responseBody: Payment_ResponseBody;
}
export class Payment_Proof {
    constructor(params: Required<Payment_Proof>) {
        Object.assign(this, params);
    }

    /**
     * Merkle proof corresponding to the attestation response.
     */
    @Validate(IsHash32, { each: true })
    @ApiProperty({
        description: `Merkle proof corresponding to the attestation response.`,
        example: ["0x0000000000000000000000000000000000000000000000000000000000000000"],
    })
    merkleProof: string[];

    /**
     * Attestation response.
     */
    @ValidateNested()
    @Type(() => Payment_Response)
    @IsDefined()
    @IsNotEmptyObject()
    @IsObject()
    @ApiProperty({ description: `Attestation response.` })
    data: Payment_Response;
}

export class Payment_RequestNoMic extends OmitType<Payment_Request, "messageIntegrityCode">(Payment_Request, ["messageIntegrityCode"] as const) {}

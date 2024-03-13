import { XrpTransaction } from "@flarenetwork/mcc";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName, serializeBigInts } from "../../../../../external-libs/utils";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { AttestationResponseDTO_Payment_Response, Payment_Request, Payment_RequestNoMic, Payment_Response } from "../../dtos/attestation-types/Payment.dto";
import { EncodedRequestResponse, MicResponse } from "../../dtos/generic/generic.dto";
import { verifyPayment } from "../../verification/generic-chain-verifications";
import { XRPProcessorService } from "../verifier-processors/xrp-processor.service";

@Injectable()
export class XRPPaymentVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<Payment_RequestNoMic, Payment_Request, Payment_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    constructor(@Inject("VERIFIER_PROCESSOR") private processor: XRPProcessorService) {
        this.store = new AttestationDefinitionStore("configs/type-definitions");
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    async verifyRequestInternal(request: Payment_Request | Payment_RequestNoMic): Promise<AttestationResponseDTO_Payment_Response> {
        if (
            request.attestationType !== encodeAttestationName("Payment") ||
            request.sourceId !== encodeAttestationName((process.env.TESTNET == "true" ? "test" : "") + "XRP")
        ) {
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: `Attestation type and source id combination not supported: (${request.attestationType}, ${
                        request.sourceId
                    }). This source supports attestation type 'Payment' (${encodeAttestationName("Payment")}) and source id '${
                        (process.env.TESTNET == "true" ? "test" : "") + "XRP"
                    }' (${encodeAttestationName((process.env.TESTNET == "true" ? "test" : "") + "XRP")}).`,
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        const fixedRequest = {
            ...request,
        } as Payment_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }

        return this.verifyRequest(fixedRequest);
    }

    async verifyRequest(fixedRequest: Payment_Request): Promise<AttestationResponseDTO_Payment_Response> {
        //-$$$<start-verifyRequest> Start of custom code section. Do not change this comment.

        const result = await verifyPayment(XrpTransaction, fixedRequest, this.processor.indexedQueryManager, this.processor.client);
        return serializeBigInts({
            status: getAttestationStatus(result.status),
            response: result.response,
        }) as AttestationResponse<Payment_Response>;

        //-$$$<end-verifyRequest> End of custom code section. Do not change this comment.
    }

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponseDTO_Payment_Response> {
        const requestJSON = this.store.parseRequest<Payment_Request>(abiEncodedRequest);
        const response = await this.verifyRequestInternal(requestJSON);
        return response;
    }

    public async prepareResponse(request: Payment_RequestNoMic): Promise<AttestationResponseDTO_Payment_Response> {
        const response = await this.verifyRequestInternal(request);
        return response;
    }

    public async mic(request: Payment_RequestNoMic): Promise<MicResponse> {
        const result = await this.verifyRequestInternal(request);
        if (result.status !== AttestationResponseStatus.VALID) {
            return new MicResponse({ status: result.status });
        }
        const response = result.response;
        if (!response) return new MicResponse({ status: result.status });
        return new MicResponse({
            status: AttestationResponseStatus.VALID,
            messageIntegrityCode: this.store.attestationResponseHash<Payment_Response>(response, MIC_SALT),
        });
    }

    public async prepareRequest(request: Payment_RequestNoMic): Promise<EncodedRequestResponse> {
        const result = await this.verifyRequestInternal(request);
        if (result.status !== AttestationResponseStatus.VALID) {
            return new EncodedRequestResponse({ status: result.status });
        }
        const response = result.response;

        if (!response) return new EncodedRequestResponse({ status: result.status });
        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<Payment_Response>(response, MIC_SALT)!,
        } as Payment_Request;

        return new EncodedRequestResponse({
            status: AttestationResponseStatus.VALID,
            abiEncodedRequest: this.store.encodeRequest(newRequest),
        });
    }
}

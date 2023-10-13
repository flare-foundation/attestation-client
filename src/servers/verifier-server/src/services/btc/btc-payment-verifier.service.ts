import { BtcTransaction } from "@flarenetwork/mcc";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName, serializeBigInts } from "../../../../../external-libs/utils";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { Payment_Request, Payment_RequestNoMic, Payment_Response } from "../../dtos/attestation-types/Payment.dto";
import { AttestationResponseDTO } from "../../dtos/generic/generic.dto";
import { verifyPayment } from "../../verification/generic-chain-verifications";
import { BTCProcessorService } from "../verifier-processors/btc-processor.service";

@Injectable()
export class BTCPaymentVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<Payment_RequestNoMic, Payment_Request, Payment_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    constructor(@Inject("VERIFIER_PROCESSOR") private processor: BTCProcessorService) {
        this.store = new AttestationDefinitionStore("configs/type-definitions");
    }

    private async verifyRequest(request: Payment_RequestNoMic | Payment_Request): Promise<AttestationResponse<Payment_Response>> {
        if (request.attestationType !== encodeAttestationName("Payment") || request.sourceId !== encodeAttestationName("BTC")) {
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: `Attestation type and source id combination not supported: (${request.attestationType}, ${request.sourceId}). This source supports attestation type 'Payment' (0x5061796d656e7400000000000000000000000000000000000000000000000000) and source id 'BTC' (0x4254430000000000000000000000000000000000000000000000000000000000).`,
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        let fixedRequest = {
            ...request,
        } as Payment_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }
        const result = await verifyPayment(BtcTransaction, fixedRequest, this.processor.indexedQueryManager, this.processor.client);
        return serializeBigInts({
            status: getAttestationStatus(result.status),
            response: result.response,
        }) as AttestationResponse<Payment_Response>;
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponseDTO<Payment_Response>> {
        const requestJSON = this.store.parseRequest<Payment_Request>(abiEncodedRequest);
        //-$$$<start-verifyEncodedRequest> Start of custom code section. Do not change this comment.

        const response = await this.verifyRequest(requestJSON);

        //-$$$<end-verifyEncodedRequest> End of custom code section. Do not change this comment.

        return response;
    }

    public async prepareResponse(request: Payment_RequestNoMic): Promise<AttestationResponseDTO<Payment_Response>> {
        //-$$$<start-prepareResponse> Start of custom code section. Do not change this comment.

        const response = await this.verifyRequest(request);

        //-$$$<end-prepareResponse> End of custom code section. Do not change this comment.

        return response;
    }

    public async mic(request: Payment_RequestNoMic): Promise<string | undefined> {
        //-$$$<start-mic> Start of custom code section. Do not change this comment.

        const result = await this.verifyRequest(request);
        const response = result.response;

        //-$$$<end-mic> End of custom code section. Do not change this comment.

        if (!response) return undefined;
        return this.store.attestationResponseHash<Payment_Response>(response, MIC_SALT)!;
    }

    public async prepareRequest(request: Payment_RequestNoMic): Promise<string | undefined> {
        //-$$$<start-prepareRequest> Start of custom code section. Do not change this comment.

        const result = await this.verifyRequest(request);
        const response = result.response;

        //-$$$<end-prepareRequest> End of custom code section. Do not change this comment.

        if (!response) return undefined;
        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<Payment_Response>(response, MIC_SALT)!,
        } as Payment_Request;

        return this.store.encodeRequest(newRequest);
    }
}

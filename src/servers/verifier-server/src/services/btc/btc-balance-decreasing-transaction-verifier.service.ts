import { BtcTransaction } from "@flarenetwork/mcc";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName, serializeBigInts } from "../../../../../external-libs/utils";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";
import {
    AttestationResponseDTO_BalanceDecreasingTransaction_Response,
    BalanceDecreasingTransaction_Request,
    BalanceDecreasingTransaction_RequestNoMic,
    BalanceDecreasingTransaction_Response,
} from "../../dtos/attestation-types/BalanceDecreasingTransaction.dto";
import { EncodedRequestResponse, MicResponse } from "../../dtos/generic/generic.dto";
import { verifyBalanceDecreasingTransaction } from "../../verification/generic-chain-verifications";
import { BTCProcessorService } from "../verifier-processors/btc-processor.service";

@Injectable()
export class BTCBalanceDecreasingTransactionVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<BalanceDecreasingTransaction_RequestNoMic, BalanceDecreasingTransaction_Request, BalanceDecreasingTransaction_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    constructor(@Inject("VERIFIER_PROCESSOR") private processor: BTCProcessorService) {
        this.store = new AttestationDefinitionStore("configs/type-definitions");
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    async verifyRequestInternal(
        request: BalanceDecreasingTransaction_Request | BalanceDecreasingTransaction_RequestNoMic,
    ): Promise<AttestationResponseDTO_BalanceDecreasingTransaction_Response> {
        if (
            request.attestationType !== encodeAttestationName("BalanceDecreasingTransaction") ||
            request.sourceId !== encodeAttestationName((process.env.TESTNET ? "test" : "") + "BTC")
        ) {
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: `Attestation type and source id combination not supported: (${request.attestationType}, ${
                        request.sourceId
                    }). This source supports attestation type 'BalanceDecreasingTransaction' (${encodeAttestationName(
                        "BalanceDecreasingTransaction",
                    )}) and source id '${(process.env.TESTNET ? "test" : "") + "BTC"}' (${encodeAttestationName(
                        (process.env.TESTNET ? "test" : "") + "BTC",
                    )}).`,
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        const fixedRequest = {
            ...request,
        } as BalanceDecreasingTransaction_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }

        return this.verifyRequest(fixedRequest);
    }

    async verifyRequest(fixedRequest: BalanceDecreasingTransaction_Request): Promise<AttestationResponseDTO_BalanceDecreasingTransaction_Response> {
        //-$$$<start-verifyRequest> Start of custom code section. Do not change this comment.

        const result = await verifyBalanceDecreasingTransaction(BtcTransaction, fixedRequest, this.processor.indexedQueryManager, this.processor.client);
        return serializeBigInts({
            status: getAttestationStatus(result.status),
            response: result.response,
        }) as AttestationResponseDTO_BalanceDecreasingTransaction_Response;

        //-$$$<end-verifyRequest> End of custom code section. Do not change this comment.
    }

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponseDTO_BalanceDecreasingTransaction_Response> {
        const requestJSON = this.store.parseRequest<BalanceDecreasingTransaction_Request>(abiEncodedRequest);
        const response = await this.verifyRequestInternal(requestJSON);
        return response;
    }

    public async prepareResponse(request: BalanceDecreasingTransaction_RequestNoMic): Promise<AttestationResponseDTO_BalanceDecreasingTransaction_Response> {
        const response = await this.verifyRequestInternal(request);
        return response;
    }

    public async mic(request: BalanceDecreasingTransaction_RequestNoMic): Promise<MicResponse> {
        const result = await this.verifyRequestInternal(request);
        if (result.status !== AttestationResponseStatus.VALID) {
            return new MicResponse({ status: result.status });
        }
        const response = result.response;
        if (!response) return new MicResponse({ status: result.status });
        return new MicResponse({
            status: AttestationResponseStatus.VALID,
            messageIntegrityCode: this.store.attestationResponseHash<BalanceDecreasingTransaction_Response>(response, MIC_SALT),
        });
    }

    public async prepareRequest(request: BalanceDecreasingTransaction_RequestNoMic): Promise<EncodedRequestResponse> {
        const result = await this.verifyRequestInternal(request);
        if (result.status !== AttestationResponseStatus.VALID) {
            return new EncodedRequestResponse({ status: result.status });
        }
        const response = result.response;

        if (!response) return new EncodedRequestResponse({ status: result.status });
        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<BalanceDecreasingTransaction_Response>(response, MIC_SALT)!,
        } as BalanceDecreasingTransaction_Request;

        return new EncodedRequestResponse({
            status: AttestationResponseStatus.VALID,
            abiEncodedRequest: this.store.encodeRequest(newRequest),
        });
    }
}

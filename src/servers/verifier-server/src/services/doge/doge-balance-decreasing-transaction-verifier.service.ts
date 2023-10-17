import { DogeTransaction } from "@flarenetwork/mcc";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName, serializeBigInts } from "../../../../../external-libs/utils";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";
import {
    BalanceDecreasingTransaction_Request,
    BalanceDecreasingTransaction_RequestNoMic,
    BalanceDecreasingTransaction_Response,
} from "../../dtos/attestation-types/BalanceDecreasingTransaction.dto";
import { AttestationResponseDTO } from "../../dtos/generic/generic.dto";
import { verifyBalanceDecreasingTransaction } from "../../verification/generic-chain-verifications";
import { DOGEProcessorService } from "../verifier-processors/doge-processor.service";

@Injectable()
export class DOGEBalanceDecreasingTransactionVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<BalanceDecreasingTransaction_RequestNoMic, BalanceDecreasingTransaction_Request, BalanceDecreasingTransaction_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    constructor(@Inject("VERIFIER_PROCESSOR") private processor: DOGEProcessorService) {
        this.store = new AttestationDefinitionStore("configs/type-definitions");
    }

    private async verifyRequest(
        request: BalanceDecreasingTransaction_RequestNoMic | BalanceDecreasingTransaction_Request,
    ): Promise<AttestationResponse<BalanceDecreasingTransaction_Response>> {
        if (request.attestationType !== encodeAttestationName("BalanceDecreasingTransaction") || request.sourceId !== encodeAttestationName("DOGE")) {
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: `Attestation type and source id combination not supported: (${request.attestationType}, ${request.sourceId}). This source supports attestation type 'BalanceDecreasingTransaction' (0x42616c616e636544656372656173696e675472616e73616374696f6e00000000) and source id 'DOGE' (0x444f474500000000000000000000000000000000000000000000000000000000).`,
                },
                HttpStatus.BAD_REQUEST
            );
        }

        let fixedRequest = {
            ...request,
        } as BalanceDecreasingTransaction_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }
        const result = await verifyBalanceDecreasingTransaction(DogeTransaction, fixedRequest, this.processor.indexedQueryManager, this.processor.client);
        return serializeBigInts({
            status: getAttestationStatus(result.status),
            response: result.response,
        }) as AttestationResponse<BalanceDecreasingTransaction_Response>;
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponseDTO<BalanceDecreasingTransaction_Response>> {
        const requestJSON = this.store.parseRequest<BalanceDecreasingTransaction_Request>(abiEncodedRequest);
        //-$$$<start-verifyEncodedRequest> Start of custom code section. Do not change this comment.

        const response = await this.verifyRequest(requestJSON);

        //-$$$<end-verifyEncodedRequest> End of custom code section. Do not change this comment.

        return response;
    }

    public async prepareResponse(request: BalanceDecreasingTransaction_RequestNoMic): Promise<AttestationResponseDTO<BalanceDecreasingTransaction_Response>> {
        //-$$$<start-prepareResponse> Start of custom code section. Do not change this comment.

        const response = await this.verifyRequest(request);

        //-$$$<end-prepareResponse> End of custom code section. Do not change this comment.

        return response;
    }

    public async mic(request: BalanceDecreasingTransaction_RequestNoMic): Promise<string | undefined> {
        //-$$$<start-mic> Start of custom code section. Do not change this comment.

        const result = await this.verifyRequest(request);
        const response = result.response;

        //-$$$<end-mic> End of custom code section. Do not change this comment.

        if (!response) return undefined;
        return this.store.attestationResponseHash<BalanceDecreasingTransaction_Response>(response, MIC_SALT)!;
    }

    public async prepareRequest(request: BalanceDecreasingTransaction_RequestNoMic): Promise<string | undefined> {
        //-$$$<start-prepareRequest> Start of custom code section. Do not change this comment.

        const result = await this.verifyRequest(request);
        const response = result.response;

        //-$$$<end-prepareRequest> End of custom code section. Do not change this comment.

        if (!response) return undefined;
        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<BalanceDecreasingTransaction_Response>(response, MIC_SALT)!,
        } as BalanceDecreasingTransaction_Request;

        return this.store.encodeRequest(newRequest);
    }
}

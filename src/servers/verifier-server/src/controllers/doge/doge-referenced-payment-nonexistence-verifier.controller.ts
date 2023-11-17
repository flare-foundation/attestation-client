///////////////////////////////////////////////////////////////
// THIS IS GENERATED CODE. DO NOT CHANGE THIS FILE MANUALLY .//
///////////////////////////////////////////////////////////////

import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";

import { DOGEReferencedPaymentNonexistenceVerifierService } from "../../services/doge/doge-referenced-payment-nonexistence-verifier.service";
import {
    AttestationResponseDTO_ReferencedPaymentNonexistence_Response,
    ReferencedPaymentNonexistence_RequestNoMic,
} from "../../dtos/attestation-types/ReferencedPaymentNonexistence.dto";
import { EncodedRequest, MicResponse, EncodedRequestResponse } from "../../dtos/generic/generic.dto";

@ApiTags("ReferencedPaymentNonexistence")
@Controller("ReferencedPaymentNonexistence")
@UseGuards(AuthGuard("api-key"))
@ApiSecurity("X-API-KEY")
export class DOGEReferencedPaymentNonexistenceVerifierController {
    constructor(private readonly verifierService: DOGEReferencedPaymentNonexistenceVerifierService) {}

    /**
     *
     * Tries to verify encoded attestation request without checking message integrity code, and if successful it returns response.
     * @param verifierBody
     * @returns
     */
    @HttpCode(200)
    @Post()
    async verify(@Body() body: EncodedRequest): Promise<AttestationResponseDTO_ReferencedPaymentNonexistence_Response> {
        return this.verifierService.verifyEncodedRequest(body.abiEncodedRequest!);
    }

    /**
     * Tries to verify attestation request (given in JSON) without checking message integrity code, and if successful it returns response.
     * @param prepareResponseBody
     * @returns
     */
    @HttpCode(200)
    @Post("prepareResponse")
    async prepareResponse(@Body() body: ReferencedPaymentNonexistence_RequestNoMic): Promise<AttestationResponseDTO_ReferencedPaymentNonexistence_Response> {
        return this.verifierService.prepareResponse(body);
    }

    /**
     * Tries to verify attestation request (given in JSON) without checking message integrity code, and if successful, it returns the correct message integrity code.
     * @param body
     */
    @HttpCode(200)
    @Post("mic")
    async mic(@Body() body: ReferencedPaymentNonexistence_RequestNoMic): Promise<MicResponse> {
        return this.verifierService.mic(body);
    }

    /**
     * Tries to verify attestation request (given in JSON) without checking message integrity code.
     * If successful, it returns the encoding of the attestation request with the correct message integrity code, which can be directly submitted to the State Connector contract.
     * @param body
     */
    @HttpCode(200)
    @Post("prepareRequest")
    async prepareRequest(@Body() body: ReferencedPaymentNonexistence_RequestNoMic): Promise<EncodedRequestResponse> {
        return this.verifierService.prepareRequest(body);
    }
}

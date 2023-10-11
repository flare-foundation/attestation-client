import { Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT, ZERO_BYTES_32 } from "../../../../../external-libs/utils";
import { AddressValidity_Request, AddressValidity_RequestNoMic, AddressValidity_Response } from "../../dtos/attestation-types/AddressValidity.dto";
import { verifyAddressDOGE } from "../../verification/address-validity/address-validity-doge";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";

@Injectable()
export class DOGEAddressValidityVerifierService {
  store!: AttestationDefinitionStore;
  exampleData!: ExampleData<AddressValidity_RequestNoMic, AddressValidity_Request, AddressValidity_Response>;

  //-$$$<start-constructor> Start of custom code section. Do not change this comment.

  constructor() {
    this.store = new AttestationDefinitionStore("configs/type-definitions");
    this.exampleData = JSON.parse(readFileSync("src/servers/verifier-server/src/example-data/AddressValidity.json", "utf8"));
  }

  private verifyRequest(request: AddressValidity_RequestNoMic | AddressValidity_Request): AttestationResponse<AddressValidity_Response> {
    let fixedRequest = {
      ...request,
    } as AddressValidity_Request;
    if (!fixedRequest.messageIntegrityCode) {
      fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
    }
    const result = verifyAddressDOGE(request.requestBody.addressStr);

    const status = getAttestationStatus(result.status);
    if (status != AttestationResponseStatus.VALID) return { status };

    const response: AddressValidity_Response = {
      attestationType: request.attestationType,
      sourceId: request.sourceId,
      votingRound: "0",
      lowestUsedTimestamp: "0xffffffffffffffff",
      requestBody: request.requestBody,
      responseBody: result.response,
    };

    return { status, response } as AttestationResponse<AddressValidity_Response>;
  }

  //-$$$<end-constructor> End of custom code section. Do not change this comment.

  public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponse<AddressValidity_Response>> {
    const requestJSON = this.store.parseRequest<AddressValidity_Request>(abiEncodedRequest);

    //-$$$<start-verifyEncodedRequest> Start of custom code section. Do not change this comment.

    // PUT YOUR CUSTOM CODE HERE

    const response = await this.verifyRequest(requestJSON);

    //-$$$<end-verifyEncodedRequest> End of custom code section. Do not change this comment.

    return response;
  }

  public async prepareResponse(request: AddressValidity_RequestNoMic): Promise<AttestationResponse<AddressValidity_Response>> {
    //-$$$<start-prepareResponse> Start of custom code section. Do not change this comment.

    // PUT YOUR CUSTOM CODE HERE

    const response = await this.verifyRequest(request);

    //-$$$<end-prepareResponse> End of custom code section. Do not change this comment.

    return response;
  }

  public async mic(request: AddressValidity_RequestNoMic): Promise<string | undefined> {
    //-$$$<start-mic> Start of custom code section. Do not change this comment.

    // PUT YOUR CUSTOM CODE HERE

    const result = await this.verifyRequest(request);
    const response = result.response;

    //-$$$<end-mic> End of custom code section. Do not change this comment.

    // Example of response body. Delete this example and provide value for variable 'response' in the custom code section above.

    if (!response) return undefined;
    return this.store.attestationResponseHash<AddressValidity_Response>(response, MIC_SALT)!;
  }

  public async prepareRequest(request: AddressValidity_RequestNoMic): Promise<string | undefined> {
    //-$$$<start-prepareRequest> Start of custom code section. Do not change this comment.

    const result = await this.verifyRequest(request);
    const response = result.response;

    //-$$$<end-prepareRequest> End of custom code section. Do not change this comment.

    if (!response) return undefined;
    const newRequest = {
      ...request,
      messageIntegrityCode: this.store.attestationResponseHash<AddressValidity_Response>(response, MIC_SALT)!,
    } as AddressValidity_Request;

    return this.store.encodeRequest(newRequest);
  }
}

import { VerifierConfigurationService } from "../../../lib/servers/verifier-server/src/services/verifier-configuration.service";
import { AttestationRequest } from "../../../lib/verification/attestation-types/attestation-types";
const axios = require("axios");

export async function sendToVerifier(configurationService: VerifierConfigurationService, attestationRequest: AttestationRequest, apiKey?: string) {
   attestationRequest.apiKey = apiKey;
   const resp = await axios.post(
      `http://localhost:${configurationService.wsServerCredentials.port}/query`,
      attestationRequest
   );
   return resp.data;
}

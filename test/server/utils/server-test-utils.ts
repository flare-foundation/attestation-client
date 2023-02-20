import axios from "axios";
import { VerifierConfigurationService } from "../../../src/servers/verifier-server/src/services/verifier-configuration.service";
import { AttestationRequest } from "../../../src/verification/attestation-types/attestation-types";

export async function sendToVerifier(configurationService: VerifierConfigurationService, attestationRequest: AttestationRequest, apiKey?: string) {
   const resp = await axios.post(
      `http://localhost:${configurationService.config.port}/query`,
      attestationRequest,
      {
         headers: {
            "x-api-key": apiKey
         }
      }
   );
   return resp.data;
}

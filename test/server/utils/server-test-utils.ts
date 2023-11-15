import axios from "axios";
import { EncodedRequest } from "../../../src/servers/verifier-server/src/dtos/generic/generic.dto";
import { VerifierConfigurationService } from "../../../src/servers/verifier-server/src/services/verifier-configuration.service";

export async function sendToVerifier(
  attestationType: string,
  sourceId: string,
  configurationService: VerifierConfigurationService,
  attestationRequest: EncodedRequest,
  apiKey?: string
) {
  const resp = await axios.post(`http://localhost:${configurationService.config.port}/${attestationType}`, attestationRequest, {
    headers: {
      "x-api-key": apiKey,
    },
  });
  return resp.data;
}

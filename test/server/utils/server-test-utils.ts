import { WSServerConfigurationService } from "../../../lib/servers/common/src";
import { AttestationRequest } from "../../../lib/verification/attestation-types/attestation-types";
const axios = require("axios");

export async function sendToVerifier(configurationService: WSServerConfigurationService, attestationRequest: AttestationRequest) {
   const resp = await axios.post(
      `http://localhost:${configurationService.wsServerConfiguration.port}/query`,
      attestationRequest
   );
   return resp.data;
}

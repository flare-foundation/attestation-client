import { DHType, DHTypeArray } from "../../../../verification/generated/attestation-hash-types";
import { ARType, ARTypeArray } from "../../../../verification/generated/attestation-request-types";
import { ApiPropertyUnion } from "../../../common/src/utils/open-api-utils";

export class VotingRoundResult {
  roundId: number;
  hash: string;
  // TODO: try if it works with ARType and DHType
  requestBytes: string;
  @ApiPropertyUnion(ARTypeArray)
  request: ARType;
  @ApiPropertyUnion(DHTypeArray)
  response: DHType;
  merkleProof: string[];
}

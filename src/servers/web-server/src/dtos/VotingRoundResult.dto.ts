import { ApiPropertyUnion } from "../../../common/src/utils/open-api-utils";
import { DHType, DHTypeArray } from "./w-hash-types.dto";
import { ARType, ARTypeArray } from "./w-request-types.dto";

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

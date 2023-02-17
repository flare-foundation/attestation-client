import { AdditionalTypeInfo } from "../../utils/reflection/reflection";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { VerifierRouter } from "../../verification/routing/VerifierRouter";
import { SourceId } from "../../verification/sources/sources";
import { SourceLimiterConfig } from "./SourceLimiterConfig";

export const DAC_REFRESH_TIME_S = 10;
/**
 * Class providing SourceLimiterConfig for each source from the @param startRoundId on.
 * NOTE: If you add any new field, please update function 'load()' accordingly!
 */
export class GlobalAttestationConfig {
  startRoundId!: number;
  defaultSetAssignerAddresses: string[] = [];
  consensusSubsetSize: number = 1;
  // !!!NOTE: If you add any new field, please update function 'load()' accordingly!

  sourceLimiters = new Map<SourceId, SourceLimiterConfig>();
  verifierRouter = new VerifierRouter();

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("defaultSetAssignerAddresses", "string");
    return info;
  }
}

export function sourceAndTypeSupported(attestationConfig: GlobalAttestationConfig, source: SourceId, type: AttestationType): boolean {
  const config = attestationConfig.sourceLimiters.get(source);
  if (!config) return false;
  const typeConfig = config.attestationTypes.get(type);
  return !!typeConfig;
}

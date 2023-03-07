import { AdditionalTypeInfo, IReflection } from "../../utils/reflection/reflection";
import { ChainConfig } from "./ChainConfig";

/**
 * Deserialization object for lists of ChainConfigs (JSON).
 */
export class ListChainConfig implements IReflection<ListChainConfig> {
  /**
   * List of chain configs
   */
  public chains: ChainConfig[] = [];

  instanciate() {
    return new ListChainConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("chains", new ChainConfig());

    return info;
  }
}

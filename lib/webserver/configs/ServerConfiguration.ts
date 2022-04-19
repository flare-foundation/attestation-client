import { AdditionalTypeInfo, IReflection, reflection } from "../../utils/typeReflection";

@reflection()
export class ServerConfiguration implements IReflection<ServerConfiguration>{

  // start epoch in sec
  public firstEpochStartTime: number = 1636070400;

  // voting round duration in sec
  public roundDurationSec: number = 90;

  instanciate() {
    return new ServerConfiguration();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }

}


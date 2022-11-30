import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../../utils/reflection";

export class ServerConfiguration implements IReflection<ServerConfiguration> {
  // start epoch in sec
  public firstEpochStartTime = 1636070400;

  // voting round duration in sec
  public roundDurationSec = 90;

  // path to service status file on server
  @optional() public serviceStatusFilePath = "";

  @optional() public deploymentName = "";

  instanciate() {
    return new ServerConfiguration();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}

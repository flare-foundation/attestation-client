import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection";

export class ServerConfiguration implements IReflection<ServerConfiguration> {
  // start epoch in sec
  public firstEpochStartTime: number = 1636070400;

  // voting round duration in sec
  public roundDurationSec: number = 90;

  // path to service status file on server
  @optional() public serviceStatusFilePath: string = "";

  @optional() public deploymentName: string = "";

  instanciate() {
    return new ServerConfiguration();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}

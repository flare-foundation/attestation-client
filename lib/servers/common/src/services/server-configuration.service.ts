import { toBN } from '@flarenetwork/mcc';
import { Injectable } from '@nestjs/common';
import { readConfig, readCredentials } from '../../../../utils/config';
import { EpochSettings } from '../../../../utils/EpochSettings';
import { ServerConfiguration } from '../config-models/ServerConfiguration';
import { ServerCredentials } from '../config-models/ServerCredentials';

@Injectable()
export class ServerConfigurationService {
   serverCredentials: ServerCredentials;
   serverConfig: ServerConfiguration;
   epochSettings: EpochSettings;
 
   constructor() {
     this.serverCredentials = readCredentials(new ServerCredentials(), "backend");
     this.serverConfig = readConfig(new ServerConfiguration(), "backend");
     this.epochSettings = new EpochSettings(toBN(this.serverConfig.firstEpochStartTime), toBN(this.serverConfig.roundDurationSec));
   }
 }
 
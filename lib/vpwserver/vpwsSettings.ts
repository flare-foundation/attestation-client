import { getGlobalLogger } from "../utils/logger";
import { SourceId } from "../verification/sources/sources";
import { NodeIndexerVP } from "./provider/nodeIndexerVP";
import { TestVP } from "./provider/testVP";
import { IVerificationProvider, VerificationType } from "./provider/verificationProvider";
import { ServerUser } from "./serverUser";
import { VPWSUsers, VPWSProtocols } from "./vpwsConfiguration";

export class VPWSSettings {

  protected logger = getGlobalLogger();

  protected serverUsers = new Array<ServerUser>();

  protected verificationProviders = new Array<IVerificationProvider>();

  protected verificationProvidersMap = new Map<string, IVerificationProvider>();

  createUsers(config: VPWSUsers) {
    this.logger.info( `creating users...` );
    
    this.serverUsers = config.serverUsers;

    this.logger.debug( `${this.serverUsers.length} users` );
  }

  findUser(auth: string, ip: string): ServerUser {
    const client = this.serverUsers.find(x => x.auth === auth);

    if (!client) {
      this.logger.error2(`client with auth '${auth}' not found (from ip ${ip})`);
      return null;
    }

    if (client.ip !== "" && client.ip !== ip) {
      this.logger.error2(`client '${client.name}' with auth '${auth}' connected from wrong ip ${ip} (locked on ${client.ip})`);
      return null;
    }

    return client;
  }

  createProviders(config: VPWSProtocols) {
    this.logger.info( `creating verification providers...` );
    
    this.verificationProviders = [];

    for (let vpConfig of config.verificationProviders) {

      let vp: IVerificationProvider = null;

      // todo: implement VP factory
      switch (vpConfig.name) {
        case "TestVP": vp = new TestVP(); break;
        case "NodeIndexerVP": vp = new NodeIndexerVP(); break;
      }

      if (!vp) {
        this.logger.error(`unable to create verification provider ${vpConfig.name}'`);
        continue;
      }

      this.logger.info( `provider: ${vp.getName()}(${vpConfig.settings})`);

      vp.initializeSettings = vpConfig.settings;

      this.verificationProviders.push(vp);
    }

    this.logger.debug( `${this.verificationProviders.length} verification providers` );
  }

  findVerificationProvider(type: VerificationType): IVerificationProvider {
    return this.verificationProvidersMap.get(type.toString());
  }


  
  initializeProviders() {

    this.logger.info( `initializing verification providers...` );

    this.verificationProvidersMap.clear();

    // cache VP types
    for (let vp of this.verificationProviders) {
      if (!vp.initialize()) {
        this.logger.error(`unable to initialize VP '${vp.getName()}'`);
        continue;
      }

      const supported = vp.getSupportedVerificationTypes();

      for (let type of supported) {
        const typeKey = type.toString();

        const vpDup = this.verificationProvidersMap.get(typeKey);

        if (vpDup) {
          this.logger.error(`duplicated VP type '${typeKey}' '${vp.getName()}' and '${vpDup.getName()}'`);
          continue;
        }

        this.logger.debug( `${VerificationType[type.attestationType]} ${SourceId[type.sourceId]} -> ${vp.getName()}` );
        
        this.verificationProvidersMap.set(typeKey, vp);
      }
    }

    this.logger.debug( `${this.verificationProvidersMap.size} verification providers types initialized` );
  }

}

export const globalSettings = new VPWSSettings();
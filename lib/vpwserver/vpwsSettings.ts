import { getGlobalLogger, logException } from "../utils/logger";
import { SourceId } from "../verification/sources/sources";
import { FactoryConstructor } from "./provider/classFactory";
import { IVerificationProvider, VerificationType } from "./provider/verificationProvider";
import { ServerUser } from "./serverUser";
import { VPWSProviders, VPWSUsers } from "./vpwsConfiguration";

export class VPWSSettings {

  protected logger = getGlobalLogger();

  protected serverUsers = new Array<ServerUser>();

  protected verificationProviders = new Array<IVerificationProvider<any>>();

  protected verificationProvidersMap = new Map<string, IVerificationProvider<any>>();

  protected supportedVerifications = new Array<VerificationType>();

  /**
   * Create user from config
   * @param config 
   */
  public createUsers(config: VPWSUsers) {
    this.logger.info(`creating users...`);

    this.serverUsers = config.serverUsers;

    this.logger.debug(`${this.serverUsers.length} users`);
  }

  public getSupportedVerifications(): VerificationType[] {
    return this.supportedVerifications;
  }

  /**
   * Find user by authentication.
   * It can be linked to specific IP.
   * @param auth 
   * @param ip 
   * @returns 
   */
  public findUserByAuthentication(auth: string, ip: string): ServerUser {
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

  /**
   * Load Verification Providers classes from file in RealTime
   * This way new classes can simply be added into folder and app restarted (no need to recompile - yarn)
   */
  protected async dynamicallyLoadClassesFromFolder() {
    this.logger.info(`loading verification providers factory files`);

    // dynamically load all factory files
    const fs = require('fs');
    const path = require('path');
    const files = fs.readdirSync(`./lib/vpwserver/provider/factory/`, { withFileTypes: false });

    for (let file of files) {
      try {
        const filename = path.parse(file).name;
        this.logger.debug(`loading ${filename}`);
        await import(`./provider/factory/${filename}`);
      }
      catch (error) {
        logException(error, `factory loading`);
      }
    }
  }


  /**
   * Create Verification Providers from factory.
   * @param config 
   */
  public async createProviders(config: VPWSProviders) {
    await this.dynamicallyLoadClassesFromFolder();

    this.logger.info(`creating verification providers...`);

    this.verificationProviders = [];

    for (let vpConfig of config.verificationProviders) {
      let vp = FactoryConstructor("VerificationProvider", vpConfig.name);

      if (!vp) {
        this.logger.error(`unable to create verification provider ${vpConfig.name}'`);
        continue;
      }

      this.logger.info(`provider: ^w${vp.getName()}^^ (${vpConfig.settings})`);

      vp.initializeSettings = vpConfig.settings;

      const supported = vp.getSupportedVerificationTypes();
      for (let i of supported) {
        this.supportedVerifications.push(i);
      }

      this.verificationProviders.push(vp);
    }

    this.logger.debug(`${this.verificationProviders.length} verification providers`);
  }

  /**
   * Return Verification Provider of specific type
   * @param type 
   * @returns 
   */
  public findVerificationProvider(type: VerificationType): IVerificationProvider<any> {
    return this.verificationProvidersMap.get(type.toString());
  }

  /**
   * Initialize Verification Providers
   * This function maps all registered verification providers types and checks for duplicates.
   */
  public async initializeProviders() {

    this.logger.info(`initializing verification providers...`);

    this.verificationProvidersMap.clear();

    // cache VP types
    for (let vp of this.verificationProviders) {
      if (!await vp.initialize()) {
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

        this.logger.debug(`${VerificationType[type.attestationType]} ${SourceId[type.sourceId]} -> ${vp.getName()}`);

        this.verificationProvidersMap.set(typeKey, vp);
      }
    }

    this.logger.debug(`${this.verificationProvidersMap.size} verification providers types initialized`);
  }

}

export const globalSettings = new VPWSSettings();
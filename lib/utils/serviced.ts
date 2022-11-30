import { logException } from "./logger";

export enum EServiceStatus {
  unknown,
  active,
  inactive,
  failed,
  invalid,
}

// todo: add up/down time
export class ServiceStatus {
  name: string;

  comment = "";

  status: EServiceStatus = EServiceStatus.unknown;

  constructor(name: string) {
    this.name = name;
  }

  async getStatus(): Promise<EServiceStatus> {
    try {
      const { exec } = require("child_process");
      const command = `systemctl --user status ${this.name}`;

      let response = "";

      return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            resolve(EServiceStatus.invalid);
            return;
          }
          if (stderr) {
            response = stderr;
            //getGlobalLogger().info(`statusResponseError '${stderr}'`);
          } else {
            response = stdout;
            //getGlobalLogger().info(`statusResponse '${stdout}'`);
          }

          //getGlobalLogger().info(`statusResponse '${response}'`);

          if (response === `Unit ${this.name}.service could not be found.`) {
            this.status = EServiceStatus.unknown;
            resolve(this.status);
            return;
          }

          if (response.indexOf("Active: inactive (dead)") >= 0) {
            this.status = EServiceStatus.inactive;
            resolve(this.status);
            return;
          }

          if (response.indexOf("Active: failed") >= 0) {
            this.status = EServiceStatus.failed;
            resolve(this.status);
            return;
          }

          if (response.indexOf("Active: active (running)") >= 0) {
            this.status = EServiceStatus.active;
            resolve(this.status);
            return;
          }

          this.status = EServiceStatus.invalid;
          resolve(this.status);
          return;
        });
      });
    } catch (error) {
      logException(error, "ServiceStatus::getStatus");
      return EServiceStatus.invalid;
    }
  }
}

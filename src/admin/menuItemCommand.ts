import { getGlobalLogger } from "../utils/logging/logger";
import { sleepms } from "../utils/helpers/utils";
import { MenuItemBase } from "./menuItemBase";
import { exec } from "child_process";

export class MenuItemCommand extends MenuItemBase {
  command: string;

  static working = false;

  constructor(name: string, command: string, parent: MenuItemBase) {
    super(name, parent);
    this.command = command;
  }

  async onExecute() {
    getGlobalLogger().info(`execute ^g${this.command}^^`);

    MenuItemCommand.working = true;

    let done = false;

    const execObj = exec(this.command);

    execObj.stdout.on("data", function (data) {
      console.log(data.replace(/\n$/, ""));
    });

    execObj.on("exit", function () {
      done = true;
    });

    // wait until exec is completed
    while (!done) {
      await sleepms(100);
    }

    MenuItemCommand.working = false;

    getGlobalLogger().info("exec completed\n");

    this.refresh(true);
  }
}

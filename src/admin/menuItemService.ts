import { ServiceStatus } from "../utils/monitoring/ServiceStatus";
import { EServiceStatus } from "../utils/monitoring/EServiceStatus";
import { MenuItemBase } from "./menuItemBase";
import { MenuItemCommand } from "./menuItemCommand";

export class MenuItemService extends MenuItemBase {
  serviceStatus: ServiceStatus;

  refreshing = false;

  static servicemMonitors = [];

  constructor(name: string, serviceName: string, parent: MenuItemBase) {
    super(name, parent);

    this.serviceStatus = new ServiceStatus(serviceName);

    MenuItemService.servicemMonitors.push(this.serviceStatus);

    this.updateStatus();

    this.addCommand("Enable", `systemctl --user enable ${name}.service`);
    this.addCommand("Disable", `systemctl --user disable ${name}.service`);
    this.addCommand("Stop", `systemctl --user stop ${name}.service`);
    this.addCommand("Restart", `systemctl --user restart ${name}.service`);
  }

  addCommand(name: string, command: string): MenuItemBase {
    return this.add(new MenuItemCommand(name, command, this));
  }

  updateStatus() {
    if (this.refreshing) return;

    this.refreshing = true;

    this.displayName = `${this.name} ...`;

    this.serviceStatus
      .getStatus()
      .then((status) => {
        //getGlobalLogger().debug( `MenuItemService status ${status}`)

        this.displayName = `${this.name} ^w^R${EServiceStatus[status]}^^`;
        this.refreshing = false;

        this.refresh();
      })
      .catch((error) => {
        //logException( error , `MenuItemService`);

        this.displayName = `${this.name} ^r${error}^^`;
        this.refreshing = false;

        this.refresh();
      });
  }

  async onExecute() {
    this.updateStatus();
    this.refresh();
  }
}

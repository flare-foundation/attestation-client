import { logException } from "../utils/logger";
import { Menu } from "./menu";

export class MenuItemBase {
  name = "";
  displayName: string = null;

  menu: Menu;

  items = [];
  itemParent: MenuItemBase;

  constructor(name: string, parent: MenuItemBase) {
    this.name = name;
    this.menu = parent?.menu;
    this.itemParent = parent;
  }

  refresh(newLocation = false) {
    if (this.menu.activeItem === this.itemParent) {
      this.menu.refresh(newLocation);
    }
  }

  getDisplay() {
    return this.displayName ? this.displayName : this.name;
  }

  add(item: MenuItemBase): MenuItemBase {
    this.items.push(item);

    return item;
  }

  async onExecute?();
  execute() {
    if (this.items != null && this.items.length > 0) {
      this.menu.navigate(this);
      return;
    }

    try {
      this.onExecute();
    } catch (error) {
      logException(error, "MenuBase::execute");
    }
  }
}

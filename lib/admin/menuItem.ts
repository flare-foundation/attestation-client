import { MenuItemBase} from "./menuItemBase";
import { MenuItemCommand } from "./menuItemCommand";
import { MenuItemLog } from "./menuItemLog";
import { MenuItemService } from "./menuItemService";
export class MenuItem {

    item: MenuItemBase;

    constructor(item: MenuItemBase) {
        this.item = item;

    }

    parent() {
        return new MenuItem( this.item.itemParent );
    }

    addSubmenu(name: string): MenuItem {
        return new MenuItem( this.item.add(new MenuItemBase(name, this.item)) );
    }

    addCommand(name: string, command: string): MenuItem {
        return new MenuItem( this.item.add(new MenuItemCommand(name, command, this.item)) );
    }
    addService(name: string, serviceName: string): MenuItem {
        return new MenuItem( this.item.add(new MenuItemService(name, serviceName, this.item)) );
    }
    addLog(name: string, filename: string): MenuItem {
        return new MenuItem( this.item.add(new MenuItemLog(name, filename, this.item)) );
    }
}

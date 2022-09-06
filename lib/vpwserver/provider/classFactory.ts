import { string } from "yargs";
import { getGlobalLogger } from "../../utils/logger";



class FactoryGroup {
    name: string;
    classInstanciators = new Map<string,()=>{}>();
}

let classGroups = new Map<string, FactoryGroup>();

export function FactoryConstructor(groupName: string, className: string) : any {

    const group = classGroups.get( groupName );
    if( !group ) {
        getGlobalLogger().error( `factory group ${groupName} not found` );
        return null;
    }

    const instanciator = group.classInstanciators.get( className );
    if( !instanciator ) {
        getGlobalLogger().error( `factory group ${groupName} class ${className} not found` );
        return null;
    }

    return instanciator();
}

export function Factory(groupName: string) {

    return (target: any, name?: string, descriptor?: any) => {

        // get factory group
        let group = classGroups.get( groupName );
        if( !group ) {
            group = new FactoryGroup();
            group.name = groupName;

            classGroups.set( groupName , group );
        }

        // create class instanciator
        group.classInstanciators.set( target.name , ()=>{return target.prototype.instanciate();} );

        return target;
    };
}

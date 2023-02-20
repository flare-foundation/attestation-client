import stringify from "safe-stable-stringify";

export function muteMySQLPasswords(command: string | any) {
   let str = stringify(command);
   return str.replace(/\-p[^ ]+/g, "-p***********");
}

export function replaceAllVars(source: string, varName: string, to: string): string {
   while (true) {
     const newSource = source.replace(`$(${varName})`, to);
     if (newSource === source) return source;
     source = newSource;
   }
 }
 
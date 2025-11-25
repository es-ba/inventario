import { AppInventario } from "./app-principal";

// exposes APIs from this package
export * from "backend-plus";
export * from "pg-promise-strict";

declare module "backend-plus"{
    interface Context {
        forDump?:boolean
        es:{admin:boolean, superior:boolean, administrativo:boolean, lectura:boolean}
    }
    interface ProcedureContext {
        be:AppInventario
    }
    interface ClientSetup {
        tableData:Record<string, Record<string, Record<string, any>>> // tableName -> json(pk) -> fieldName -> value
    }
    interface User {
        usuario:string
        rol:string
    }
}

export type Constructor<T> = new(...args: any[]) => T;
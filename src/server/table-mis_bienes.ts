"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {reporte_bienes_listado} from "./table-reporte_bienes_listado";
import {VinculoConElBien, vinculoConElBien} from "./reportes-bienes";
import {MI_RESPONSABLE} from "./politicas";

function columnasDeReferencia(base:TableDefinition, columna:string):string[]{
    const fk = (base.foreignKeys ?? []).find(
        fk => fk.fields.some(par => (typeof par === 'string' ? par : par.source) === columna)
    );
    if(fk == null){
        return [columna];
    }
    const alias = fk.alias ?? fk.references;
    return [columna, ...(fk.displayFields ?? []).map(campo => `${alias}__${campo}`)];
}

function misBienes(context:TableContext, vinculo:VinculoConElBien):TableDefinition{
    const base = reporte_bienes_listado(context);
    return {
        ...base,
        name:vinculo.mio.tabla,
        title:vinculo.mio.title,
        sql:{
            ...base.sql,
            where:`"${vinculo.mio.tabla}".${vinculo.columna} = ${MI_RESPONSABLE}`,
        },
        hiddenColumns:columnasDeReferencia(base, vinculo.columna),
    };
}

export function mis_bienes_a_cargo(context:TableContext):TableDefinition{
    return misBienes(context, vinculoConElBien('cargo'));
}

export function mis_bienes_asignados(context:TableContext):TableDefinition{
    return misBienes(context, vinculoConElBien('asignado'));
}

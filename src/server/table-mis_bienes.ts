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

function columnasOcultas(base:TableDefinition, vinculo:VinculoConElBien):string[]{
    return [vinculo.columna, ...vinculo.columnasConstantes].flatMap(
        columna => columnasDeReferencia(base, columna)
    );
}

function misBienes(context:TableContext, vinculo:VinculoConElBien, tambien:string[] = []):TableDefinition{
    const base = reporte_bienes_listado(context);
    const condiciones = [vinculo.columna, ...tambien]
        .map(columna => `"${vinculo.mio.tabla}".${columna} = ${MI_RESPONSABLE}`);
    return {
        ...base,
        name:vinculo.mio.tabla,
        title:vinculo.mio.title,
        sql:{
            ...base.sql,
            where:condiciones.length === 1 ? condiciones[0] : `(${condiciones.join(' OR ')})`,
        },
        hiddenColumns:tambien.length ? [] : columnasOcultas(base, vinculo),
    };
}

export function mis_bienes_a_cargo(context:TableContext):TableDefinition{
    return misBienes(context, vinculoConElBien('cargo'), ['responsable_directo']);
}

export function mis_bienes_asignados(context:TableContext):TableDefinition{
    return misBienes(context, vinculoConElBien('asignado'));
}

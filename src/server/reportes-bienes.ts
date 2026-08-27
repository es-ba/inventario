"use strict";

import {sqlBienes, textoONuloSql} from './table-bienes';


export const SIN_ASIGNAR = '(sin asignar)';

const textoONulo = textoONuloSql;

const SOLO_ALTA = `v.activo`;

const MEDIDAS = `
    count(*) AS cantidad`;

export type VinculoConElBien = {
    rol:'cargo'|'asignado',
    columna:'responsable'|'enusode_responsable',
    contador:'cantidad'|'cantidad_asignados',
    expresion:string,
    titulo:string,
    detalle:{abr:string, label:string},
    mio:{tabla:string, title:string, label:string},
};

export const VINCULOS_CON_EL_BIEN:readonly VinculoConElBien[] = [
    {
        rol:'cargo',
        columna:'responsable',
        contador:'cantidad',
        expresion:`coalesce(${textoONulo('v.responsable')}, '${SIN_ASIGNAR}')`,
        titulo:'a cargo',
        detalle:{abr:'B', label:'Bienes a cargo'},
        mio:{tabla:'mis_bienes_a_cargo', title:'Bienes a mi cargo', label:'a mi cargo'},
    },
    {
        rol:'asignado',
        columna:'enusode_responsable',
        contador:'cantidad_asignados',
        expresion:textoONulo('v.enusode_responsable'),
        titulo:'asignados',
        detalle:{abr:'Asig', label:'Bienes asignados'},
        mio:{tabla:'mis_bienes_asignados', title:'Bienes asignados a mí', label:'asignados a mí'},
    },
];

export function vinculoConElBien(rol:VinculoConElBien['rol']):VinculoConElBien{
    const vinculo = VINCULOS_CON_EL_BIEN.find(v => v.rol === rol);
    if(vinculo == null){
        throw new Error(`No hay un vínculo con el bien llamado "${rol}"`);
    }
    return vinculo;
}

const CONTADOR_A_CARGO = vinculoConElBien('cargo').contador;

export const sqlBienesPorSector = `
WITH por_sector AS (
    SELECT
        coalesce(nullif(btrim(r.sector), ''), '${SIN_ASIGNAR}') AS sector,
        count(DISTINCT nullif(btrim(v.responsable), '')) AS responsables,
        count(DISTINCT nullif(btrim(v.sede), '')) AS sedes,
        count(DISTINCT nullif(btrim(v.espacio), '')) AS espacios,
        ${MEDIDAS}
    FROM (${sqlBienes}) v
    LEFT JOIN responsables r ON r.responsable = v.responsable
    WHERE ${SOLO_ALTA}
    GROUP BY coalesce(nullif(btrim(r.sector), ''), '${SIN_ASIGNAR}')
)
SELECT
    p.sector,
    p.responsables,
    p.sedes,
    p.espacios,
    p.cantidad,
    (SELECT coalesce(sum(d.cantidad), 0)
        FROM por_sector d
        WHERE d.sector = p.sector
           OR sector_pertenece(d.sector, p.sector)) AS cantidad_dependientes
FROM por_sector p
`;

export const CLASES_PARQUE_TECNOLOGICO = ['4', '6'];

export type AtributoDeGrilla = {atributo:string, nombre:string};

let atributosDeBienes:AtributoDeGrilla[] = [];

export function setAtributosDeBienes(lista:AtributoDeGrilla[]):void{
    atributosDeBienes = lista;
}

export function getAtributosDeBienes():AtributoDeGrilla[]{
    return atributosDeBienes;
}

export type ColumnaDeAtributo = {
    atributo:string,
    columna:string,
    titulo:string,
};

const literalSql = (valor:string):string => "'" + valor.replace(/'/g, "''") + "'";

export function columnasDeAtributos(atributos:AtributoDeGrilla[]):ColumnaDeAtributo[]{
    const usadas = new Set<string>();
    return atributos.map(a => {
        const normalizado = String(a.atributo)
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 50);
        const base = 'atr_' + (normalizado === '' ? 'sin_nombre' : normalizado);
        let columna = base;
        let n = 2;
        while(usadas.has(columna)){
            columna = `${base}_${n++}`;
        }
        usadas.add(columna);
        return {
            atributo:String(a.atributo),
            columna,
            titulo:String(a.nombre ?? '').trim() || String(a.atributo),
        };
    });
}

export function sqlParqueTecnologico(atributos:AtributoDeGrilla[] = atributosDeBienes):string{
    const mapeo = columnasDeAtributos(atributos);
    const columnas = mapeo.map(c =>
        `        max(ba.valor) FILTER (WHERE ba.atributo = ${literalSql(c.atributo)}) AS ${c.columna}`
    );
    const pivot = columnas.length
        ? `LEFT JOIN LATERAL (\n    SELECT\n${columnas.join(',\n')}\n`
            + `    FROM bien_atributo ba WHERE ba.ficha = v.ficha\n) atr ON true`
        : '';
    const seleccionAtributos = mapeo.length
        ? ',\n' + mapeo.map(c => `    atr.${c.columna}`).join(',\n')
        : '';

    return `
SELECT
    v.ficha,
    ${textoONulo('v.grupo')} AS grupo,
    ${textoONulo('v.detalle')} AS detalle,
    ${textoONulo('v.marca')} AS marca,
    ${textoONulo('v.modelo')} AS modelo,
    ${textoONulo('v.serie')} AS serie,
    ${textoONulo('v.imei')} AS imei,
    ${textoONulo('v.linea')} AS linea,
    v.activo AS activo,
    ${textoONulo('v.estado')} AS estado,
    ${textoONulo('v.rubro')} AS rubro,
    ${textoONulo('v.clase')} AS clase,
    ${textoONulo('v.cuenta')} AS cuenta,
    ${textoONulo('v.sector')} AS sector,
    ${textoONulo('v.sede')} AS sede,
    ${textoONulo('v.espacio')} AS espacio,
    ${textoONulo('v.responsable')} AS responsable${seleccionAtributos}
FROM (${sqlBienes}) v
${pivot}
WHERE ${SOLO_ALTA}
  AND btrim(coalesce(v.rubro, '')) = '3'
  AND btrim(coalesce(v.clase, '')) IN (${CLASES_PARQUE_TECNOLOGICO.map(c => `'${c}'`).join(', ')})
`;
}

export const sqlBienesListado = `
SELECT
    v.ficha,
    ${textoONulo('v.detalle')} AS detalle,
    ${textoONulo('v.marca')} AS marca,
    ${textoONulo('v.modelo')} AS modelo,
    ${textoONulo('v.serie')} AS serie,
    v.activo AS activo,
    ${textoONulo('v.estado')} AS estado,
    ${textoONulo('v.categoria')} AS categoria,
    ${textoONulo('v.tipo_bien')} AS tipo_bien,
    ${textoONulo('v.rubro')} AS rubro,
    ${textoONulo('v.clase')} AS clase,
    ${textoONulo('v.cuenta')} AS cuenta,
    coalesce(nullif(btrim(v.sector), ''), '${SIN_ASIGNAR}') AS sector,

    coalesce(nullif(btrim(r.sector), ''), '${SIN_ASIGNAR}') AS sector_responsable,
    ${textoONulo('v.sede')} AS sede,
    ${textoONulo('v.espacio')} AS espacio,
    ${vinculoConElBien('cargo').expresion} AS responsable,
    ${textoONulo('v.tipo_asignacion')} AS tipo_asignacion,
    ${textoONulo('v.modalidad_uso')} AS modalidad_uso,
    ${textoONulo('v.enusode')} AS enusode,
    ${vinculoConElBien('asignado').expresion} AS enusode_responsable
FROM (${sqlBienes}) v
LEFT JOIN responsables r ON r.responsable = v.responsable
WHERE ${SOLO_ALTA}
`;

export const sqlBienesConDependientes = `
SELECT
    a.sector AS depende_de,
    ${textoONulo('a.responsable')} AS jefe,
    l.*
FROM (${sqlBienesListado}) l
JOIN responsables r ON r.responsable = l.responsable
JOIN sectores a ON sector_pertenece(r.sector, a.sector)
`;

export const sqlBienesPorResponsable = `
WITH por_responsable AS (
    SELECT
        p.responsable,
${VINCULOS_CON_EL_BIEN.map(vinculo =>
`        count(*) FILTER (WHERE p.rol = '${vinculo.rol}') AS ${vinculo.contador},`
).join('\n')}
        count(DISTINCT nullif(btrim(v.sector), '')) AS sectores,
        count(DISTINCT nullif(btrim(v.sede), '')) AS sedes
    FROM (${sqlBienes}) v
    CROSS JOIN LATERAL (VALUES
${VINCULOS_CON_EL_BIEN.map(vinculo =>
`        ('${vinculo.rol}', ${vinculo.expresion})`
).join(',\n')}
    ) AS p(rol, responsable)
    WHERE ${SOLO_ALTA}
      AND p.responsable IS NOT NULL
    GROUP BY p.responsable
),

personas AS (
    SELECT responsable, sector FROM responsables
    UNION ALL
    SELECT '${SIN_ASIGNAR}', NULL::text
)
SELECT
    pe.responsable,
${VINCULOS_CON_EL_BIEN.map(vinculo =>
`    coalesce(c.${vinculo.contador}, 0) AS ${vinculo.contador},`
).join('\n')}
    coalesce(c.sectores, 0)           AS sectores,
    coalesce(c.sedes, 0)              AS sedes,
    coalesce(d.personas, 0)           AS personas_dependientes,
    coalesce(c.${CONTADOR_A_CARGO}, 0) + coalesce(d.cantidad, 0) AS cantidad_dependientes
FROM personas pe
LEFT JOIN por_responsable c ON c.responsable = pe.responsable

LEFT JOIN LATERAL (
    SELECT count(*) AS personas,
           coalesce(sum(o.${CONTADOR_A_CARGO}), 0) AS cantidad
        FROM responsables sub
        LEFT JOIN por_responsable o ON o.responsable = sub.responsable
        WHERE sub.responsable IS DISTINCT FROM pe.responsable
          AND EXISTS (SELECT 1 FROM sectores j
                        WHERE j.responsable = pe.responsable
                          AND sector_pertenece(sub.sector, j.sector))
) d ON true
`;

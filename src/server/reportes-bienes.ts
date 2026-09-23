"use strict";

import {sqlBienes, textoONuloSql} from './table-bienes';
import {CLASES_PARQUE_TECNOLOGICO, condicionParqueTecnologico} from './controles-bien';


export const SIN_ASIGNAR = '(sin asignar)';

const textoONulo = textoONuloSql;

export const NIVELES_DE_SECTOR = 10;

export const ARBOL_DE_SECTORES = `sector_arbol AS (
    SELECT s.sector, s.sector AS ancestro, 0 AS nivel
        FROM sectores s
    UNION ALL
    SELECT a.sector, s.pertenece_a, a.nivel + 1
        FROM sector_arbol a
        JOIN sectores s ON s.sector = a.ancestro
        WHERE s.pertenece_a IS NOT NULL
          AND a.nivel < ${NIVELES_DE_SECTOR - 1}
)`;

export function perteneceASql(sector:string, ancestro:string):string{
    return `EXISTS (SELECT 1 FROM sector_arbol sa`
        + ` WHERE sa.sector = ${sector} AND sa.ancestro = ${ancestro})`;
}

const SOLO_ALTA = `v.activo`;

const MEDIDAS = `
    count(*) AS cantidad`;

export type VinculoConElBien = {
    rol:'cargo'|'asignado',
    columna:'responsable'|'enusode_responsable',
    columnasConstantes:readonly string[],
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
        columnasConstantes:['sector_responsable'],
        contador:'cantidad',
        expresion:`coalesce(${textoONulo('s.responsable')}, '${SIN_ASIGNAR}')`,
        titulo:'a cargo por sector',
        detalle:{abr:'B', label:'Bienes a cargo'},
        mio:{tabla:'mis_bienes_a_cargo', title:'Bienes a mi cargo', label:'a mi cargo'},
    },
    {
        rol:'asignado',
        columna:'enusode_responsable',
        columnasConstantes:[],
        contador:'cantidad_asignados',
        expresion:textoONulo('v.enusode_responsable'),
        titulo:'asignados',
        detalle:{abr:'Asig', label:'Bienes asignados'},
        mio:{tabla:'mis_bienes_asignados', title:'Bienes en uso mío', label:'en uso mío'},
    },
];

export function vinculoConElBien(rol:VinculoConElBien['rol']):VinculoConElBien{
    const vinculo = VINCULOS_CON_EL_BIEN.find(v => v.rol === rol);
    if(vinculo == null){
        throw new Error(`No hay un vínculo con el bien llamado "${rol}"`);
    }
    return vinculo;
}

export const sqlBienesPorSector = `
WITH RECURSIVE ${ARBOL_DE_SECTORES},
por_sector AS (
    SELECT
        coalesce(nullif(btrim(v.sector), ''), '${SIN_ASIGNAR}') AS sector,
        count(DISTINCT nullif(btrim(s.responsable), '')) AS responsables,
        count(DISTINCT nullif(btrim(v.sede), '')) AS sedes,
        count(DISTINCT nullif(btrim(v.espacio), '')) AS espacios,
        ${MEDIDAS}
    FROM (${sqlBienes}) v
    LEFT JOIN sectores s ON s.sector = v.sector
    WHERE ${SOLO_ALTA}
    GROUP BY coalesce(nullif(btrim(v.sector), ''), '${SIN_ASIGNAR}')
),
sectores_del_reporte AS (
    SELECT sector FROM sectores
    UNION
    SELECT sector FROM por_sector
),
totales_directos AS (
    SELECT s.sector,
        coalesce(g.responsables, 0) AS responsables,
        coalesce(g.sedes, 0) AS sedes,
        coalesce(g.espacios, 0) AS espacios,
        coalesce(g.cantidad, 0) AS cantidad
    FROM sectores_del_reporte s LEFT JOIN por_sector g USING (sector)
)
SELECT
    p.sector,
    ${textoONulo('se.responsable')} AS responsable,
    p.responsables,
    p.sedes,
    p.espacios,
    p.cantidad,
    (SELECT count(*)
        FROM sectores s
        WHERE s.sector IS DISTINCT FROM p.sector
          AND ${perteneceASql('s.sector', 'p.sector')}) AS sectores_dependientes,
    (SELECT count(*)
        FROM responsables re
        WHERE re.sector = p.sector) AS personas,
    (SELECT count(*)
        FROM responsables re
        WHERE ${perteneceASql('re.sector', 'p.sector')}) AS personas_dependientes,
    (SELECT count(*)
        FROM espacios e
        WHERE e.sector = p.sector) AS espacios_propios,
    (SELECT count(*)
        FROM espacios e
        WHERE ${perteneceASql('e.sector', 'p.sector')}) AS espacios_dependientes,
    (SELECT coalesce(sum(d.cantidad), 0)
        FROM por_sector d
        WHERE d.sector = p.sector
           OR ${perteneceASql('d.sector', 'p.sector')}) AS cantidad_dependientes
FROM totales_directos p
LEFT JOIN sectores se ON se.sector = p.sector
`;

export const sqlBienesPorEspacio = `
SELECT g.*, e.sector
    FROM (
        SELECT
            coalesce(${textoONulo('v.espacio')}, '${SIN_ASIGNAR}') AS espacio,
            count(DISTINCT nullif(btrim(s.responsable), '')) AS responsables,
            count(DISTINCT nullif(btrim(v.sector), '')) AS sectores,
            ${MEDIDAS}
        FROM (${sqlBienes}) v
        LEFT JOIN sectores s ON s.sector = v.sector
        WHERE ${SOLO_ALTA}
        GROUP BY coalesce(${textoONulo('v.espacio')}, '${SIN_ASIGNAR}')
    ) g
LEFT JOIN espacios e ON e.espacio = g.espacio
`;

export {CLASES_PARQUE_TECNOLOGICO, condicionParqueTecnologico};

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
    ${textoONulo('s.responsable')} AS responsable,
    ${textoONulo('v.responsable')} AS responsable_directo${seleccionAtributos}
FROM (${sqlBienes}) v
LEFT JOIN sectores s ON s.sector = v.sector
${pivot}
WHERE ${condicionParqueTecnologico('v')}
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
    ${textoONulo('v.tipo_bien')} AS tipo_bien,
    ${textoONulo('v.rubro')} AS rubro,
    ${textoONulo('v.clase')} AS clase,
    ${textoONulo('v.cuenta')} AS cuenta,
    coalesce(nullif(btrim(v.sector), ''), '${SIN_ASIGNAR}') AS sector,

    coalesce(nullif(btrim(r.sector), ''), '${SIN_ASIGNAR}') AS sector_responsable,
    ${textoONulo('v.sede')} AS sede,
    ${textoONulo('v.espacio')} AS espacio,
    v.puesto AS puesto,
    ${vinculoConElBien('cargo').expresion} AS responsable,
    ${textoONulo('v.responsable')} AS responsable_directo,
    ${textoONulo('v.tipo_asignacion')} AS tipo_asignacion,
    ${textoONulo('v.modalidad_uso')} AS modalidad_uso,
    ${textoONulo('v.enusode')} AS enusode,
    ${vinculoConElBien('asignado').expresion} AS enusode_responsable
FROM (${sqlBienes}) v
LEFT JOIN sectores s ON s.sector = v.sector
LEFT JOIN responsables r ON r.responsable = s.responsable
WHERE ${SOLO_ALTA}
`;

export const sqlBienesBaja = `
SELECT
    v.ficha,
    v.activo AS activo,
    ${textoONulo('v.detalle')} AS detalle,
    ${textoONulo('v.marca')} AS marca,
    ${textoONulo('v.modelo')} AS modelo,
    ${textoONulo('v.serie')} AS serie,
    ${textoONulo('v.estado_baja')} AS estado_baja,
    ${textoONulo('v.motivo_baja')} AS motivo_baja,
    v.fecha_solicitud AS fecha_solicitud,
    v.fecha_finalizacion AS fecha_finalizacion,
    ${textoONulo('v.autorizado_por')} AS autorizado_por,
    ${textoONulo('v.documento_respaldo')} AS documento_respaldo,
    ${textoONulo('v.solicitado_por')} AS solicitado_por,
    ${textoONulo('v.revisado_por')} AS revisado_por,
    v.fecha_revision AS fecha_revision,
    ${textoONulo('v.motivo_rechazo')} AS motivo_rechazo,
    ${textoONulo('v.motivo_restauracion')} AS motivo_restauracion,
    ${textoONulo('v.restaurado_por')} AS restaurado_por,
    v.fecha_restauracion AS fecha_restauracion,
    coalesce(nullif(btrim(v.sector), ''), '${SIN_ASIGNAR}') AS sector,
    ${textoONulo('v.sede')} AS sede,
    ${textoONulo('v.espacio')} AS espacio,
    ${vinculoConElBien('cargo').expresion} AS responsable,
    ${textoONulo('v.responsable')} AS responsable_directo
FROM (${sqlBienes}) v
LEFT JOIN sectores s ON s.sector = v.sector
WHERE v.estado_baja IS NOT NULL OR NOT ${SOLO_ALTA}
`;

export const sqlBienesConDependientes = `
WITH RECURSIVE ${ARBOL_DE_SECTORES}
SELECT
    a.sector AS depende_de,
    ${textoONulo('a.responsable')} AS jefe,
    a.sector = l.sector AS directo,
    l.*
FROM (${sqlBienesListado}) l
JOIN sector_arbol sa ON sa.sector = l.sector
JOIN sectores a ON a.sector = sa.ancestro
`;

// Un jefe puede dirigir sectores superpuestos en el organigrama.
export const sqlBienesSectoresACargo = `
SELECT DISTINCT ON (jefe, ficha) d.*
FROM (${sqlBienesConDependientes}) d
WHERE jefe IS NOT NULL
ORDER BY jefe, ficha, directo DESC, depende_de
`;

export const sqlBienesPorResponsable = `
WITH RECURSIVE ${ARBOL_DE_SECTORES},
por_responsable AS (
    SELECT
        p.responsable,
${VINCULOS_CON_EL_BIEN.map(vinculo =>
`        count(*) FILTER (WHERE p.rol = '${vinculo.rol}') AS ${vinculo.contador},`
).join('\n')}
        count(DISTINCT nullif(btrim(v.sector), '')) AS sectores,
        count(DISTINCT nullif(btrim(v.sede), '')) AS sedes
    FROM (${sqlBienes}) v
    LEFT JOIN sectores s ON s.sector = v.sector
    CROSS JOIN LATERAL (VALUES
${VINCULOS_CON_EL_BIEN.map(vinculo =>
`        ('${vinculo.rol}', ${vinculo.expresion})`
).join(',\n')}
    ) AS p(rol, responsable)
    WHERE ${SOLO_ALTA}
      AND p.responsable IS NOT NULL
    GROUP BY p.responsable
),

dependientes AS (
    SELECT j.jefe,
           count(*) AS personas
        FROM (
            SELECT DISTINCT s.responsable AS jefe, sub.responsable AS dependiente
                FROM sectores s
                JOIN sector_arbol sa ON sa.ancestro = s.sector
                JOIN responsables sub ON sub.sector = sa.sector
                WHERE s.responsable IS NOT NULL
                  AND sub.responsable IS DISTINCT FROM s.responsable
        ) j
        GROUP BY j.jefe
),

bienes_de_sectores AS (
    SELECT s.responsable AS jefe,
        count(DISTINCT v.ficha) AS cantidad
    FROM (${sqlBienes}) v
    JOIN sector_arbol sa ON sa.sector = ${textoONulo('v.sector')}
    JOIN sectores s ON s.sector = sa.ancestro
    WHERE ${SOLO_ALTA} AND s.responsable IS NOT NULL
    GROUP BY s.responsable
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
    coalesce(bs.cantidad, 0) AS cantidad_dependientes
FROM personas pe
LEFT JOIN por_responsable c ON c.responsable = pe.responsable
LEFT JOIN dependientes d ON d.jefe = pe.responsable
LEFT JOIN bienes_de_sectores bs ON bs.jefe = pe.responsable
`;

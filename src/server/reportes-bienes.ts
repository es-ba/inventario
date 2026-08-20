"use strict";

import {sqlBienes, textoONuloSql} from './table-bienes';

/*
    SQL compartido por los reportes de bienes.

    Los reportes se apoyan en la misma vista que usa la grilla de bienes (sqlBienes), así
    que el área, la sede, el espacio y el responsable salen del último movimiento de cada
    ficha — la misma definición que ve el usuario en pantalla. Si esa lógica cambia, los
    reportes la siguen sin tocar nada.

    No definen tabla física: al declarar sql.from sin isTable, backend-plus los resuelve
    como una subconsulta y no genera DDL. Las policies de bienes y movimientos_bien se
    aplican igual, porque el filtro de RLS es por tabla y no depende del anidamiento.
*/

/** Etiqueta para los bienes que todavía no tienen movimiento que los ubique. */
export const SIN_ASIGNAR = '(sin asignar)';

const ESTADO = `upper(btrim(coalesce(v.activo, '')))`;

/** Mismo criterio que la vista de bienes: vacío es NULL, nunca ''. */
const textoONulo = textoONuloSql;

/*
    Todos los reportes son del patrimonio vigente: sólo los bienes en alta.

    Está en una sola constante para que no se desincronicen entre sí. Un bien dado de baja
    sigue teniendo área y responsable —el último que tuvo—, y contarlo ahí infla el
    inventario de un sector con cosas que ya no están.

    Los bienes en baja se consultan desde la grilla de bienes, que tiene su propia vista
    filtrada, y desde la búsqueda de React, que tiene la solapa "Bienes en baja".
*/
const SOLO_ALTA = `${ESTADO} = 'ALTA'`;

/*
    Columnas de medición comunes a los reportes agrupados.

    No hay cantidad_alta ni cantidad_baja: con el reporte filtrado por alta, la primera
    sería igual a cantidad y la segunda siempre cero. Una columna que siempre dice lo mismo
    no informa, confunde.
*/
const MEDIDAS = `
    count(*) AS cantidad`;

export const sqlBienesPorArea = `
SELECT
    coalesce(nullif(btrim(v.area), ''), '${SIN_ASIGNAR}') AS area,
    count(DISTINCT nullif(btrim(v.responsable), '')) AS responsables,
    count(DISTINCT nullif(btrim(v.sede), '')) AS sedes,
    count(DISTINCT nullif(btrim(v.espacio), '')) AS espacios,
    ${MEDIDAS}
FROM (${sqlBienes}) v
WHERE ${SOLO_ALTA}
GROUP BY coalesce(nullif(btrim(v.area), ''), '${SIN_ASIGNAR}')
`;

/*
    Parque tecnológico: la clase contable 3.6 (Elementos y Dispositivos para Computación)
    y la 3.4 (Aparatos... Telefonía). Ahí caen tablets, notebooks, celulares, GPS, PCs,
    impresoras y equipamiento de comunicaciones.
*/
export const CLASES_PARQUE_TECNOLOGICO = ['4', '6'];

export type AtributoDeGrilla = {atributo:string, nombre:string};

/*
    Los atributos son datos, no código: se dan de alta en bienes_atributos. Por eso la
    lista se carga al arrancar (postConfig) y de ahí sale una columna por atributo, en vez
    de tenerlos fijos acá. Agregar un atributo nuevo requiere reiniciar, no recompilar.
*/
let atributosDeBienes:AtributoDeGrilla[] = [];

export function setAtributosDeBienes(lista:AtributoDeGrilla[]):void{
    atributosDeBienes = lista;
}

export function getAtributosDeBienes():AtributoDeGrilla[]{
    return atributosDeBienes;
}

export type ColumnaDeAtributo = {
    /** El código tal como está en bienes_atributos. Sólo se usa como literal. */
    atributo:string,
    /** El nombre de columna, derivado y siempre válido. */
    columna:string,
    titulo:string,
};

const literalSql = (valor:string):string => "'" + valor.replace(/'/g, "''") + "'";

/*
    El código del atributo lo escribe un administrador desde la pantalla de atributos, así
    que no se puede usar como nombre de columna: puede tener espacios, acentos, mayúsculas,
    o llamarse igual que una columna del bien ("estado", "serie", "ficha").

    Por eso la columna se deriva: se normaliza el código, se le antepone atr_ para que no
    pueda chocar con nada del bien, y si dos códigos distintos normalizan igual se
    desempatan con un sufijo. Nunca falla: un código raro da una columna fea, no un error.
*/
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

/**
 * Pasa los atributos de filas a columnas. El LATERAL evita tener que agrupar por todas
 * las columnas del bien, que es lo que vuelve ilegible un pivot hecho con GROUP BY.
 */
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

    /*
        Se exponen los códigos crudos, no las versiones "código — descripción". La
        descripción la agrega backend-plus como columna aparte, vía displayFields en las
        foreign keys de la definición de la tabla. Concatenar los dos en un solo campo
        deja el filtro inutilizable: no se puede buscar ni por código ni por descripción.
    */
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
    ${textoONulo('v.activo')} AS activo,
    ${textoONulo('v.estado')} AS estado,
    ${textoONulo('v.rubro')} AS rubro,
    ${textoONulo('v.clase')} AS clase,
    ${textoONulo('v.cuenta')} AS cuenta,
    ${textoONulo('v.area')} AS area,
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

/*
    Listado al que se baja desde cualquiera de los reportes.

    No repite todos los campos del bien: sólo los de asignación y las características que
    sirven para reconocerlo. Los códigos van en su versión "código — descripción", que es
    la que la vista ya arma y la única que le dice algo a quien lee el reporte. Las
    columnas area y responsable van en crudo porque son las que enlazan con el maestro;
    la grilla las oculta sola al mostrarlas como detalle.
*/
export const sqlBienesListado = `
SELECT
    v.ficha,
    ${textoONulo('v.detalle')} AS detalle,
    ${textoONulo('v.marca')} AS marca,
    ${textoONulo('v.modelo')} AS modelo,
    ${textoONulo('v.serie')} AS serie,
    ${textoONulo('v.activo')} AS activo,
    ${textoONulo('v.estado')} AS estado,
    ${textoONulo('v.categoria')} AS categoria,
    ${textoONulo('v.tipo_bien')} AS tipo_bien,
    ${textoONulo('v.rubro')} AS rubro,
    ${textoONulo('v.clase')} AS clase,
    ${textoONulo('v.cuenta')} AS cuenta,
    coalesce(nullif(btrim(v.area), ''), '${SIN_ASIGNAR}') AS area,
    ${textoONulo('v.sede')} AS sede,
    ${textoONulo('v.espacio')} AS espacio,
    coalesce(nullif(btrim(v.responsable), ''), '${SIN_ASIGNAR}') AS responsable,
    ${textoONulo('v.tipo_asignacion')} AS tipo_asignacion,
    ${textoONulo('v.modalidad_uso')} AS modalidad_uso,
    ${textoONulo('v.enusode')} AS enusode
FROM (${sqlBienes}) v
WHERE ${SOLO_ALTA}
`;

export const sqlBienesPorResponsable = `
SELECT
    coalesce(nullif(btrim(v.responsable), ''), '${SIN_ASIGNAR}') AS responsable,
    count(DISTINCT nullif(btrim(v.area), '')) AS areas,
    count(DISTINCT nullif(btrim(v.sede), '')) AS sedes,
    ${MEDIDAS}
FROM (${sqlBienes}) v
WHERE ${SOLO_ALTA}
GROUP BY coalesce(nullif(btrim(v.responsable), ''), '${SIN_ASIGNAR}')
`;

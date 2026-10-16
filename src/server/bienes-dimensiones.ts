import type {DimensionDisponible, FamiliaDimension} from '../common/bienes-agrupar';
import {claveDeAtributo} from '../common/bienes-agrupar';
import type {DimensionSql} from './bienes-busqueda-query';

export type CampoDeTabla = {name:string, title?:string, label?:string, isName?:boolean};

export type DefinicionDeTabla = {
    name?:string,
    fields:CampoDeTabla[],
    nameFields?:string[],
    foreignKeys?:{references:string, fields:(string|{source:string, target:string})[]}[],
    sql?:{tableName?:string},
};

export type AtributoDisponible = {atributo:string, nombre?:string|null};

export type CatalogoDeDimensiones = {
    disponibles:DimensionDisponible[],
    sql:Record<string, DimensionSql>,
    reemplazos:Record<string, string[]>,
};

type Dimension = {clave:string, etiqueta:string, familia:FamiliaDimension, sql:DimensionSql, reemplaza?:string[], soloFiltro?:boolean};

function identificador(nombre:string):string{
    return `"${nombre.replace(/"/g, '""')}"`;
}

function textoONulo(expresion:string):string{
    return `nullif(btrim(${expresion}), '')`;
}

const MODELO_SIN_ESPACIOS_REPETIDOS = "nullif(regexp_replace(btrim(b.modelo), '\\s+', ' ', 'g'), '')";

function codigoYTexto(codigo:string, texto:string):string{
    return `CASE
        WHEN ${textoONulo(codigo)} IS NULL THEN NULL
        WHEN ${textoONulo(`coalesce(${texto}, '')`)} IS NULL THEN btrim(${codigo})
        ELSE btrim(${codigo}) || ' — ' || btrim(${texto})
    END`;
}

function fija(valor:string, texto:string):DimensionSql{
    return () => ({valor, texto});
}

const RESPONSABLE_DEL_SECTOR = '(SELECT s.responsable FROM sectores s WHERE s.sector = b.sector)';

const NOMBRE_DEL_RESPONSABLE_DEL_SECTOR = `(SELECT concat_ws(', ', ${textoONulo('r.apellido')}, ${textoONulo('r.nombre')})
    FROM sectores s JOIN responsables r ON r.responsable = s.responsable
    WHERE s.sector = b.sector)`;

const ESPECIALES:Dimension[] = [
    {clave:'sector', etiqueta:'sector', familia:'asignación',
        sql:fija(textoONulo('b.sector'), 'b.sector_texto'),
        reemplaza:['sector_sigla', 'nombre_sector']},
    {clave:'sector_rama', etiqueta:'sector y subsectores', familia:'asignación', soloFiltro:true,
        sql:() => ({
            valor:textoONulo('b.sector'),
            texto:'b.sector_texto',
            filtro:parametro => `sector_pertenece(${textoONulo('b.sector')}, ${parametro})`,
        })},
    {clave:'responsable_sector', etiqueta:'responsable del sector', familia:'asignación',
        sql:fija(textoONulo(RESPONSABLE_DEL_SECTOR), codigoYTexto(RESPONSABLE_DEL_SECTOR, NOMBRE_DEL_RESPONSABLE_DEL_SECTOR)),
        reemplaza:['responsable_sector_nombre']},
    {clave:'responsable', etiqueta:'responsable directo', familia:'asignación',
        sql:fija(textoONulo('b.responsable'), 'b.responsable_texto'),
        reemplaza:['responsable_nombre']},
    {clave:'enusode_responsable', etiqueta:'asignado a', familia:'asignación',
        sql:fija(textoONulo('b.enusode_responsable'), codigoYTexto('b.enusode_responsable', 'b.enusode_responsable_nombre')),
        reemplaza:['enusode_responsable_nombre']},
    {clave:'en_uso', etiqueta:'en uso de un responsable', familia:'asignación',
        sql:fija(
            `CASE WHEN ${textoONulo('b.enusode_responsable')} IS NULL THEN 'NO' ELSE 'SI' END`,
            `CASE WHEN ${textoONulo('b.enusode_responsable')} IS NULL THEN 'No' ELSE 'Sí' END`,
        )},
    {clave:'sede', etiqueta:'sede', familia:'asignación',
        sql:fija(textoONulo('b.sede'), 'b.sede_texto'),
        reemplaza:['sede_nombre']},
    {clave:'espacio', etiqueta:'espacio', familia:'asignación',
        sql:fija(textoONulo('b.espacio'), 'b.espacio_texto'),
        reemplaza:['espacio_numero']},
    {clave:'tipo_asignacion', etiqueta:'tipo de asignación', familia:'asignación',
        sql:fija(textoONulo('b.tipo_asignacion'), 'b.tipo_asignacion_texto')},
    {clave:'categoria', etiqueta:'categoría', familia:'clasificación',
        sql:fija(textoONulo('b.categoria'), 'b.categoria_texto')},
    {clave:'subcategoria', etiqueta:'subcategoría', familia:'clasificación',
        sql:fija(textoONulo('b.subcategoria'), 'b.subcategoria_texto')},
    {clave:'modelo', etiqueta:'modelo', familia:'clasificación',
        sql:fija(MODELO_SIN_ESPACIOS_REPETIDOS, MODELO_SIN_ESPACIOS_REPETIDOS)},
    {clave:'clase', etiqueta:'clase', familia:'clasificación',
        sql:fija(
            `CASE WHEN ${textoONulo('b.clase')} IS NULL THEN NULL ELSE concat_ws('/', btrim(b.rubro), btrim(b.clase)) END`,
            'b.clase_texto',
        )},
    {clave:'cuenta', etiqueta:'cuenta', familia:'clasificación',
        sql:fija(
            `CASE WHEN ${textoONulo('b.cuenta')} IS NULL THEN NULL ELSE concat_ws('/', btrim(b.rubro), btrim(b.clase), btrim(b.cuenta)) END`,
            'b.cuenta_texto',
        )},
];

function columnaDescriptiva(referida:DefinicionDeTabla, columnaClave:string):string|undefined{
    const nombres = (referida.nameFields?.length
        ? referida.nameFields
        : referida.fields.filter(campo => campo.isName).map(campo => campo.name))
        .filter(nombre => nombre !== columnaClave);
    if(nombres.length){
        return nombres[0];
    }
    return ['descripcion', 'nombre'].find(nombre => referida.fields.some(campo => campo.name === nombre));
}

export function dimensionesPorReferencias(
    tabla:DefinicionDeTabla,
    definicionDe:(nombre:string) => DefinicionDeTabla|undefined,
    excluidas:ReadonlySet<string>,
):Dimension[]{
    return (tabla.foreignKeys ?? []).flatMap(referencia => {
        if(referencia.fields.length !== 1){
            return [];
        }
        const par = referencia.fields[0];
        const origen = typeof par === 'string' ? par : par.source;
        const destino = typeof par === 'string' ? par : par.target;
        const campo = tabla.fields.find(f => f.name === origen);
        const referida = definicionDe(referencia.references);
        if(!campo || !referida || excluidas.has(origen)){
            return [];
        }
        const codigo = `b.${identificador(origen)}`;
        const descriptiva = columnaDescriptiva(referida, destino);
        const tablaReferida = identificador(referida.sql?.tableName ?? referida.name ?? referencia.references);
        const texto = descriptiva
            ? codigoYTexto(codigo, `(SELECT r.${identificador(descriptiva)} FROM ${tablaReferida} r WHERE r.${identificador(destino)} = ${codigo})`)
            : textoONulo(codigo);
        return [{
            clave:origen,
            etiqueta:campo.label ?? campo.title ?? origen.replace(/_/g, ' '),
            familia:'clasificación' as const,
            sql:fija(textoONulo(codigo), texto),
        }];
    });
}

export function dimensionesPorAtributos(
    atributos:AtributoDisponible[],
):Dimension[]{
    return atributos.map(({atributo, nombre}) => ({
        clave:claveDeAtributo(atributo),
        etiqueta:nombre && nombre !== atributo ? `${nombre} (${atributo})` : atributo,
        familia:'atributo' as const,
        sql:(addValue) => {
            const expresion = `(SELECT ${textoONulo('ba.valor')} FROM bien_atributo ba`
                + ` WHERE ba.ficha = b.ficha AND ba.atributo = ${addValue(atributo)}::text)`;
            return {valor:expresion, texto:expresion};
        },
    }));
}

export function armarCatalogoDeDimensiones(
    tabla:DefinicionDeTabla,
    definicionDe:(nombre:string) => DefinicionDeTabla|undefined,
    atributos:AtributoDisponible[],
):CatalogoDeDimensiones{
    const especiales = new Set(ESPECIALES.map(d => d.clave));
    const porClave = (a:{etiqueta:string}, b:{etiqueta:string}) => a.etiqueta.localeCompare(b.etiqueta);
    const todas:Dimension[] = [
        ...ESPECIALES.filter(d => d.familia === 'asignación'),
        ...[
            ...ESPECIALES.filter(d => d.familia === 'clasificación'),
            ...dimensionesPorReferencias(tabla, definicionDe, especiales),
        ].sort(porClave),
        ...dimensionesPorAtributos(atributos).sort(porClave),
    ];
    return {
        disponibles:todas.filter(d => !d.soloFiltro).map(({clave, etiqueta, familia, reemplaza}) =>
            reemplaza?.length ? {clave, etiqueta, familia, reemplaza} : {clave, etiqueta, familia}),
        sql:Object.fromEntries(todas.map(d => [d.clave, d.sql])),
        reemplazos:Object.fromEntries(todas.filter(d => d.reemplaza?.length).map(d => [d.clave, d.reemplaza!])),
    };
}

import {
    BienAtributoResumen,
    BienesBusquedaFilter,
    BienesBusquedaOperator,
    BienesBusquedaRequest,
} from '../common/contracts';
import {
    DimensionAgrupar,
    GrupoFiltro,
    MAXIMO_DIMENSIONES,
    claveDeAtributo,
} from '../common/bienes-agrupar';

export type BienesBusquedaFieldInfo = {
    typeName: string;
};

export type BienesBusquedaQueryOptions = {
    baseSql: string;
    baseSqlSimple?: string;
    camposSimples?: ReadonlySet<string>;
    visibilitySql: string;
    allowedFields: Record<string, BienesBusquedaFieldInfo>;
    resolveSqlFieldName?: (publicName:string) => string;
    allowedAttributes?: Record<string, BienesBusquedaFieldInfo>;
    withoutPagination?: boolean;
    dimensiones?: Readonly<Record<string, DimensionSql>>;
};

export type BienesBusquedaQueries = {
    dataSql: string;
    countSql: string;
    filterValues: unknown[];
    dataValues: unknown[];
    countValues: unknown[];
};

const OPERATORS = new Set<BienesBusquedaOperator>([
    'contains',
    'equals',
    'not_equals',
    'starts_with',
    'ends_with',
    'empty',
    'not_empty',
    'greater_than',
    'greater_or_equal',
    'less_than',
    'less_or_equal',
    'between',
    'in',
]);

const MAXIMO_VALORES = 500;

const PAGE_SIZES = new Set([10, 25, 50, 100]);

export type DimensionSql = (addValue: (value: unknown) => string) => {valor: string, texto: string};

function opcional<K extends string, V>(clave: K, valor: V | undefined): Partial<Record<K, V>> {
    return valor === undefined ? {} : {[clave]: valor} as Record<K, V>;
}

function parseDimension(value: unknown): DimensionAgrupar {
    if (typeof value !== 'string' || value.trim() === '' || value.length > 200) {
        throw new Error(`No se puede agrupar por: ${String(value)}`);
    }
    return value;
}

function parseAgruparPor(value: unknown): DimensionAgrupar[] | undefined {
    if (value == null) {
        return undefined;
    }
    if (!Array.isArray(value)) {
        throw new Error('agruparPor debe ser una lista');
    }
    const dimensiones = value.map(parseDimension);
    if (dimensiones.length > MAXIMO_DIMENSIONES) {
        throw new Error(`Se puede agrupar por hasta ${MAXIMO_DIMENSIONES} dimensiones`);
    }
    if (new Set(dimensiones).size !== dimensiones.length) {
        throw new Error('No se puede agrupar dos veces por la misma dimensión');
    }
    return dimensiones;
}

function parseGrupoFiltro(value: unknown): GrupoFiltro[] | undefined {
    if (value == null) {
        return undefined;
    }
    if (!Array.isArray(value)) {
        throw new Error('grupoFiltro debe ser una lista');
    }
    if (value.length > MAXIMO_DIMENSIONES) {
        throw new Error(`El grupo tiene más de ${MAXIMO_DIMENSIONES} dimensiones`);
    }
    return value.map((item) => {
        if (item == null || typeof item !== 'object') {
            throw new Error('Cada parte del grupo debe ser un objeto');
        }
        const parte = item as Record<string, unknown>;
        const valor = parte.valor;
        if (valor != null && typeof valor !== 'string') {
            throw new Error('El valor del grupo debe ser texto o nulo');
        }
        return {dimension: parseDimension(parte.dimension), valor: valor ?? null};
    });
}

function parseValores(value: unknown): (string | null)[] {
    if (!Array.isArray(value) || value.length === 0 || value.length > MAXIMO_VALORES) {
        throw new Error(`«Es alguno de» requiere una lista de 1 a ${MAXIMO_VALORES} valores`);
    }
    return value.map((valor) => {
        if (valor != null && (typeof valor !== 'string' || valor.length > 200)) {
            throw new Error('Cada valor de la lista debe ser texto o nulo');
        }
        return valor ?? null;
    });
}

function parseFilter(value: unknown): BienesBusquedaFilter {
    if (value == null || typeof value !== 'object') {
        throw new Error('Cada filtro debe ser un objeto');
    }
    const filter = value as Record<string, unknown>;
    const source = String(filter.source ?? '');
    const target = String(filter.target ?? '').trim();
    const operator = String(filter.operator ?? '') as BienesBusquedaOperator;
    if (source !== 'field' && source !== 'attribute') {
        throw new Error(`Origen de filtro no permitido: ${source}`);
    }
    if (!target) {
        throw new Error('El campo o atributo del filtro es obligatorio');
    }
    if (!OPERATORS.has(operator)) {
        throw new Error(`Operador no permitido: ${operator}`);
    }
    if (operator === 'in') {
        return {source, target, operator, value: parseValores(filter.value)};
    }
    const valueIsEmpty = filter.value == null
        || (typeof filter.value === 'string' && filter.value.trim() === '');
    if (!['empty', 'not_empty'].includes(operator) && valueIsEmpty) {
        throw new Error(`El operador ${operator} requiere un valor`);
    }
    const valueToIsEmpty = filter.valueTo == null
        || (typeof filter.valueTo === 'string' && filter.valueTo.trim() === '');
    if (operator === 'between' && valueToIsEmpty) {
        throw new Error('El operador entre requiere dos valores');
    }
    return {
        source,
        target,
        operator,
        value: filter.value,
        valueTo: filter.valueTo,
    };
}

export function parseBienesBusquedaRequest(value: unknown): BienesBusquedaRequest {
    let parsed = value;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch (_err) {
            throw new Error('La búsqueda avanzada no contiene JSON válido');
        }
    }
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('La búsqueda avanzada debe ser un objeto');
    }
    const request = parsed as Record<string, unknown>;
    const estado = String(request.estado ?? 'todos');
    const logicOperator = String(request.logicOperator ?? 'and');
    const page = Number(request.page ?? 0);
    const pageSize = Number(request.pageSize ?? 25);
    if (!['activo', 'baja', 'todos'].includes(estado)) {
        throw new Error(`Estado de búsqueda no permitido: ${estado}`);
    }
    if (!['and', 'or'].includes(logicOperator)) {
        throw new Error(`Operador lógico no permitido: ${logicOperator}`);
    }
    if (!Number.isInteger(page) || page < 0) {
        throw new Error('La página debe ser un entero mayor o igual a cero');
    }
    if (!PAGE_SIZES.has(pageSize)) {
        throw new Error('El tamaño de página debe ser 10, 25, 50 o 100');
    }
    const filters = Array.isArray(request.filters) ? request.filters.map(parseFilter) : [];
    const gridFilters = Array.isArray(request.gridFilters) ? request.gridFilters.map(parseFilter) : [];
    if (filters.length > 50 || gridFilters.length > 20) {
        throw new Error('La búsqueda contiene demasiados filtros');
    }
    const sortModel = (Array.isArray(request.sortModel) ? request.sortModel : [])
        .slice(0, 3)
        .map((sortValue) => {
            if (sortValue == null || typeof sortValue !== 'object') {
                throw new Error('El orden debe ser un objeto');
            }
            const sort = sortValue as Record<string, unknown>;
            const direction = String(sort.sort ?? '');
            if (direction !== 'asc' && direction !== 'desc') {
                throw new Error(`Dirección de orden no permitida: ${direction}`);
            }
            return {
                field: String(sort.field ?? '').trim(),
                sort: direction as 'asc' | 'desc',
            };
        });
    return {
        estado: estado as BienesBusquedaRequest['estado'],
        logicOperator: logicOperator as BienesBusquedaRequest['logicOperator'],
        filters,
        quickSearch: String(request.quickSearch ?? '').trim(),
        gridFilters,
        page,
        pageSize: pageSize as BienesBusquedaRequest['pageSize'],
        sortModel,
        ...opcional('agruparPor', parseAgruparPor(request.agruparPor)),
        ...opcional('grupoFiltro', parseGrupoFiltro(request.grupoFiltro)),
    };
}

function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

function sqlFieldName(publicName:string, options:BienesBusquedaQueryOptions):string{
    return options.resolveSqlFieldName?.(publicName) ?? publicName;
}

function normalizedType(typeName: string): 'text' | 'number' | 'date' | 'boolean' {
    if (['decimal', 'bigint', 'integer', 'number'].includes(typeName)) {
        return 'number';
    }
    if (typeName === 'date' || typeName === 'timestamp') {
        return 'date';
    }
    if (typeName === 'boolean') {
        return 'boolean';
    }
    return 'text';
}

function allowedOperators(typeName: string): Set<BienesBusquedaOperator> {
    const emptyOperators: BienesBusquedaOperator[] = ['empty', 'not_empty'];
    switch (normalizedType(typeName)) {
    case 'number':
    case 'date':
        return new Set([
            'equals',
            'not_equals',
            'greater_than',
            'greater_or_equal',
            'less_than',
            'less_or_equal',
            'between',
            ...emptyOperators,
        ]);
    case 'boolean':
        return new Set(['equals', 'not_equals', ...emptyOperators]);
    default:
        return new Set([
            'contains',
            'equals',
            'not_equals',
            'starts_with',
            'ends_with',
            ...emptyOperators,
        ]);
    }
}

function compareSql(
    expression: string,
    typeName: string,
    filter: BienesBusquedaFilter,
    addValue: (value: unknown) => string,
): string {
    if (!allowedOperators(typeName).has(filter.operator)) {
        throw new Error(`El operador ${filter.operator} no es válido para ${filter.target}`);
    }
    const type = normalizedType(typeName);
    if (filter.operator === 'empty') {
        return type === 'text'
            ? `coalesce(${expression}::text, '') = ''`
            : `${expression} IS NULL`;
    }
    if (filter.operator === 'not_empty') {
        return type === 'text'
            ? `coalesce(${expression}::text, '') <> ''`
            : `${expression} IS NOT NULL`;
    }
    const parameter = addValue(filter.value);
    if (type === 'text') {
        switch (filter.operator) {
        case 'contains':
            return `coalesce(${expression}::text, '') ILIKE '%' || ${parameter} || '%'`;
        case 'starts_with':
            return `coalesce(${expression}::text, '') ILIKE ${parameter} || '%'`;
        case 'ends_with':
            return `coalesce(${expression}::text, '') ILIKE '%' || ${parameter}`;
        case 'not_equals':
            return `lower(coalesce(${expression}::text, '')) <> lower(${parameter}::text)`;
        default:
            return `lower(coalesce(${expression}::text, '')) = lower(${parameter}::text)`;
        }
    }
    if (filter.operator === 'between') {
        const parameterTo = addValue(filter.valueTo);
        return `${expression} BETWEEN ${parameter} AND ${parameterTo}`;
    }
    const sqlOperators:Partial<Record<BienesBusquedaOperator, string>> = {
        equals: '=',
        not_equals: '<>',
        greater_than: '>',
        greater_or_equal: '>=',
        less_than: '<',
        less_or_equal: '<=',
    };
    const sqlOperator = sqlOperators[filter.operator];
    if (!sqlOperator) {
        throw new Error(`Operador no permitido: ${filter.operator}`);
    }
    return `${expression} ${sqlOperator} ${parameter}`;
}

function attributeExpression(typeName: string): string {
    switch (normalizedType(typeName)) {
    case 'number':
        return `(CASE WHEN ba.valor ~ '^[+-]?[0-9]+([.,][0-9]+)?$' THEN replace(ba.valor, ',', '.')::numeric END)`;
    case 'date':
        return `(CASE
            WHEN ba.valor ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
            THEN CASE
                WHEN substring(ba.valor FROM 1 FOR 4)::integer BETWEEN 1 AND 9999
                THEN CASE
                    WHEN substring(ba.valor FROM 9 FOR 2)::integer <= extract(
                        day FROM (
                            make_date(
                                substring(ba.valor FROM 1 FOR 4)::integer,
                                substring(ba.valor FROM 6 FOR 2)::integer,
                                1
                            ) + interval '1 month - 1 day'
                        )
                    )::integer
                    THEN make_date(
                        substring(ba.valor FROM 1 FOR 4)::integer,
                        substring(ba.valor FROM 6 FOR 2)::integer,
                        substring(ba.valor FROM 9 FOR 2)::integer
                    )
                END
            END
        END)`;
    case 'boolean':
        return `(CASE WHEN lower(ba.valor) IN ('true','t','1','si','sí') THEN true WHEN lower(ba.valor) IN ('false','f','0','no') THEN false END)`;
    default:
        return 'ba.valor';
    }
}

function variosValoresSql(
    filter: BienesBusquedaFilter,
    options: BienesBusquedaQueryOptions,
    addValue: (value: unknown) => string,
): string {
    const clave = filter.source === 'attribute' ? claveDeAtributo(filter.target) : filter.target;
    if (!options.dimensiones || !Object.prototype.hasOwnProperty.call(options.dimensiones, clave)) {
        throw new Error(`${filter.target} no admite una lista de valores`);
    }
    const expresion = sqlDeDimension(clave, options, addValue).valor;
    const valores = filter.value as (string | null)[];
    const textos = valores.filter((valor): valor is string => valor != null);
    return `(${[
        textos.length ? `(${expresion}) = ANY(${addValue(textos)}::text[])` : '',
        textos.length < valores.length ? `(${expresion}) IS NULL` : '',
    ].filter(Boolean).join(' OR ')})`;
}

function buildCondition(
    filter: BienesBusquedaFilter,
    options: BienesBusquedaQueryOptions,
    addValue: (value: unknown) => string,
): string {
    if (filter.source === 'field') {
        const field = options.allowedFields[filter.target];
        if (!field) {
            throw new Error(`Campo no permitido: ${filter.target}`);
        }
        if (filter.operator === 'in') {
            return variosValoresSql(filter, options, addValue);
        }
        const internalName = sqlFieldName(filter.target, options);
        const columna = `b.${quoteIdentifier(internalName)}`;
        return compareSql(field.typeName === 'timestamp' ? `${columna}::date` : columna, field.typeName, filter, addValue);
    }
    const attribute = options.allowedAttributes?.[filter.target];
    if (options.allowedAttributes && !attribute) {
        throw new Error(`Atributo no permitido: ${filter.target}`);
    }
    if (filter.operator === 'in') {
        return variosValoresSql(filter, options, addValue);
    }
    const typeName = attribute?.typeName ?? 'text';
    const attributeParameter = addValue(filter.target);
    const valueCondition = compareSql(attributeExpression(typeName), typeName, filter, addValue);
    return `EXISTS (
        SELECT 1
          FROM bien_atributo ba
         WHERE ba.ficha = b.ficha
           AND ba.atributo = ${attributeParameter}
           AND ${valueCondition}
    )`;
}

const CAMPOS_DE_IDENTIFICACION = ['ficha', 'numero_integrado', 'serie', 'detalle', 'grupo', 'marca', 'modelo'];

type BusquedaRapida = {condicion: string, terminos: string[], candidatos: string[]};

function coincideSql(alias: string, field: string, options: BienesBusquedaQueryOptions, parameter: string): string {
    return `coalesce(${alias}.${quoteIdentifier(sqlFieldName(field, options))}::text, '') ILIKE '%' || ${parameter} || '%'`;
}

function relevanciaSql({terminos, candidatos}: BusquedaRapida, options: BienesBusquedaQueryOptions) {
    const identificacion = CAMPOS_DE_IDENTIFICACION.filter((field) => candidatos.includes(field));
    const casos = [
        terminos.length === 1 && candidatos.includes('ficha')
            ? `WHEN lower(bf.ficha::text) = lower(${terminos[0]}) THEN 0` : '',
        identificacion.length
            ? `WHEN ${terminos.map((parameter) =>
                `(${identificacion.map((field) => coincideSql('bf', field, options, parameter)).join(' OR ')})`
            ).join(' AND ')} THEN 1` : '',
    ].filter(Boolean);
    const rango = casos.length ? `CASE ${casos.join(' ')} ELSE 2 END` : '2';
    const coincideEn = `array_remove(ARRAY[${candidatos.map((field) =>
        `CASE WHEN ${terminos.map((parameter) => coincideSql('bf', field, options, parameter)).join(' OR ')} THEN '${field}' END`
    ).join(', ')}]::text[], NULL)`;
    return {
        lateral: `\n         CROSS JOIN LATERAL (SELECT ${rango} AS rango) relevancia`,
        columna: `,\n               CASE WHEN relevancia.rango = 2 THEN ${coincideEn} ELSE '{}'::text[] END AS coincide_en`,
        orden: 'relevancia.rango, ',
    };
}

function quickSearchSql(
    quickSearch: string,
    options: BienesBusquedaQueryOptions,
    addValue: (value: unknown) => string,
): BusquedaRapida | null {
    if (!quickSearch) {
        return null;
    }
    const candidates = [
        'ficha',
        'numero_integrado',
        'detalle',
        'observacion',
        'serie',
        'modelo',
        'grupo',
        'marca',
        'rubro',
        'clase',
        'cuenta',
        'responsable',
        'responsable_sector',
        'responsable_sector_nombre',
        'sector',
        'sede',
        'espacio',
        'tipo_asignacion',
        'modalidad_uso',
        'enusode',
    ].filter((field) => options.allowedFields[field]);
    if (!candidates.length) {
        return null;
    }
    const terminos = quickSearch.split(/\s+/).filter(Boolean).map((term) => addValue(term));
    return {
        condicion: `(${terminos.map((parameter) =>
            `(${candidates.map((field) => coincideSql('b', field, options, parameter)).join(' OR ')})`
        ).join(' AND ')})`,
        terminos,
        candidatos: candidates,
    };
}

function soloCamposSimples(
    request: BienesBusquedaRequest,
    options: BienesBusquedaQueryOptions,
    busquedaRapida: BusquedaRapida | null,
): boolean {
    if (options.baseSqlSimple == null || (request.grupoFiltro ?? []).length) {
        return false;
    }
    const usados = [
        ...request.filters.filter((filter) => filter.source === 'field').map((filter) => filter.target),
        ...request.gridFilters.map((filter) => filter.target),
        ...(busquedaRapida?.candidatos ?? []),
    ];
    return usados.every((campo) => options.camposSimples?.has(campo));
}

function buildFiltradoCte(
    request: BienesBusquedaRequest,
    options: BienesBusquedaQueryOptions,
): {
    cte: string,
    cteCount: string,
    filterValues: unknown[],
    addValue: (value: unknown) => string,
    busquedaRapida: BusquedaRapida | null,
} {
    const filterValues: unknown[] = [];
    const addValue = (value: unknown): string => {
        filterValues.push(value);
        return `$${filterValues.length}`;
    };
    const where: string[] = [`(${options.visibilitySql})`];
    if (request.estado === 'activo') {
        where.push(`b.activo`);
    } else if (request.estado === 'baja') {
        where.push(`NOT b.activo`);
    }
    if (request.filters.length) {
        const separator = request.logicOperator === 'or' ? ' OR ' : ' AND ';
        where.push(`(${request.filters.map((filter) =>
            buildCondition(filter, options, addValue)
        ).join(separator)})`);
    }
    if (request.gridFilters.length) {
        where.push(`(${request.gridFilters.map((filter) =>
            buildCondition({...filter, source: 'field'}, options, addValue)
        ).join(' AND ')})`);
    }
    const busquedaRapida = quickSearchSql(request.quickSearch, options, addValue);
    if (busquedaRapida) {
        where.push(busquedaRapida.condicion);
    }
    for (const {dimension, valor} of request.grupoFiltro ?? []) {
        const expresion = sqlDeDimension(dimension, options, addValue).valor;
        where.push(valor == null
            ? `(${expresion}) IS NULL`
            : `(${expresion}) = ${addValue(valor)}::text`);
    }
    const armarCte = (base: string) => `WITH bienes_filtrados AS (
        SELECT b.*
          FROM (${base}) b
         WHERE ${where.join('\n           AND ')}
    )`;
    const baseCount = soloCamposSimples(request, options, busquedaRapida)
        ? options.baseSqlSimple as string
        : options.baseSql;
    return {cte:armarCte(options.baseSql), cteCount:armarCte(baseCount), filterValues, addValue, busquedaRapida};
}

function sqlDeDimension(
    dimension: DimensionAgrupar,
    options: BienesBusquedaQueryOptions,
    addValue: (value: unknown) => string,
): {valor: string, texto: string} {
    const armar = options.dimensiones && Object.prototype.hasOwnProperty.call(options.dimensiones, dimension)
        ? options.dimensiones[dimension]
        : undefined;
    if (!armar) {
        throw new Error(`No se puede agrupar por: ${dimension}`);
    }
    return armar(addValue);
}

export function buildBienesBusquedaQueries(
    requestValue: BienesBusquedaRequest | unknown,
    options: BienesBusquedaQueryOptions,
): BienesBusquedaQueries {
    const request = parseBienesBusquedaRequest(requestValue);
    const {cte, cteCount, filterValues, busquedaRapida} = buildFiltradoCte(request, options);
    const relevancia = busquedaRapida && !request.sortModel.length
        ? relevanciaSql(busquedaRapida, options)
        : null;
    const requestedSorts = request.sortModel.length
        ? request.sortModel
        : [{field: 'ficha', sort: 'asc' as const}];
    const sorts = requestedSorts.some(({field}) => field === 'ficha')
        ? requestedSorts
        : [...requestedSorts, {field:'ficha', sort:'asc' as const}];
    const orderBy = sorts.map(({field, sort}) => {
        if (!options.allowedFields[field]) {
            throw new Error(`Campo de orden no permitido: ${field}`);
        }
        return `bf.${quoteIdentifier(sqlFieldName(field, options))} ${sort.toUpperCase()}`;
    }).join(', ');
    const countSql = `${cteCount}
        SELECT count(*)::integer AS total
          FROM bienes_filtrados`;
    const dataValues = [...filterValues];
    let paginationSql = '';
    if (!options.withoutPagination) {
        dataValues.push(request.pageSize, request.page * request.pageSize);
        paginationSql = `\n         LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`;
    }
    const dataSql = `${cte}
        SELECT bf.*,
               coalesce((
                   SELECT jsonb_agg(
                              jsonb_build_object(
                                  'atributo', ba.atributo,
                                  'nombre', a.nombre,
                                  'valor', ba.valor
                              )
                              ORDER BY coalesce(a.nombre, ba.atributo), ba.atributo
                          )
                     FROM bien_atributo ba
                     LEFT JOIN bienes_atributos a USING (atributo)
                    WHERE ba.ficha = bf.ficha
               ), '[]'::jsonb) AS atributos${relevancia?.columna ?? ''}
          FROM bienes_filtrados bf${relevancia?.lateral ?? ''}
         ORDER BY ${relevancia?.orden ?? ''}${orderBy}${paginationSql}`;
    return {
        dataSql,
        countSql,
        filterValues: [...filterValues],
        dataValues,
        countValues: [...filterValues],
    };
}

export type BienesAgrupadoQuery = {
    dimensiones: DimensionAgrupar[];
    sql: string;
    values: unknown[];
};

export function buildBienesAgrupadoQuery(
    requestValue: BienesBusquedaRequest | unknown,
    options: BienesBusquedaQueryOptions,
): BienesAgrupadoQuery {
    const request = parseBienesBusquedaRequest(requestValue);
    const dimensiones = request.agruparPor ?? [];
    if (dimensiones.length === 0) {
        throw new Error('Hay que indicar por qué agrupar');
    }
    const {cte, filterValues, addValue} = buildFiltradoCte(request, options);
    const columnas = dimensiones.map((dimension, i) => {
        const {valor, texto} = sqlDeDimension(dimension, options, addValue);
        return `${valor} AS valor_${i},\n               ${texto} AS texto_${i}`;
    }).join(',\n               ');
    const valores = dimensiones.map((_dimension, i) => `d.valor_${i}`);
    const textos = dimensiones.map((_dimension, i) => `min(d.texto_${i})`);
    const sql = `${cte}
        SELECT jsonb_build_array(${valores.join(', ')}) AS valores,
               jsonb_build_array(${textos.join(', ')}) AS textos,
               count(*)::integer AS cantidad
          FROM bienes_filtrados b
          CROSS JOIN LATERAL (
            SELECT ${columnas}
          ) d
         GROUP BY ${valores.join(', ')}
         ORDER BY cantidad DESC, ${textos.map(texto => `${texto} NULLS LAST`).join(', ')}`;
    return {dimensiones, sql, values: filterValues};
}

function csvCell(value: unknown): string {
    const text = value == null ? '' : String(value);
    if (/[;"\r\n,]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function attributesText(value: unknown): string {
    let attributes = value;
    if (typeof attributes === 'string') {
        try {
            attributes = JSON.parse(attributes);
        } catch (_err) {
            return String(attributes);
        }
    }
    if (!Array.isArray(attributes)) {
        return '';
    }
    return attributes.map((attributeValue) => {
        const attribute = attributeValue as BienAtributoResumen;
        return `${attribute.nombre || attribute.atributo}: ${attribute.valor ?? ''}`;
    }).join(' | ');
}

export function rowsToCsv(rows: Record<string, unknown>[], fields: string[]): string {
    const headers = [...fields, 'atributos'];
    const lines = [
        headers.map(csvCell).join(';'),
        ...rows.map((row) => [
            ...fields.map((field) => csvCell(row[field])),
            `"${attributesText(row.atributos).replace(/"/g, '""')}"`,
        ].join(';')),
    ];
    return `\uFEFF${lines.join('\r\n')}\r\n`;
}

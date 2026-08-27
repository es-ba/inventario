import {
    BienAtributoResumen,
    BienesBusquedaFilter,
    BienesBusquedaOperator,
    BienesBusquedaRequest,
} from '../common/contracts';

export type BienesBusquedaFieldInfo = {
    typeName: string;
};

export type BienesBusquedaQueryOptions = {
    baseSql: string;
    visibilitySql: string;
    allowedFields: Record<string, BienesBusquedaFieldInfo>;
    resolveSqlFieldName?: (publicName:string) => string;
    allowedAttributes?: Record<string, BienesBusquedaFieldInfo>;
    withoutPagination?: boolean;
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
]);

const PAGE_SIZES = new Set([10, 25, 50, 100]);

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
    if (typeName === 'date') {
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
        const internalName = sqlFieldName(filter.target, options);
        return compareSql(`b.${quoteIdentifier(internalName)}`, field.typeName, filter, addValue);
    }
    const attribute = options.allowedAttributes?.[filter.target];
    if (options.allowedAttributes && !attribute) {
        throw new Error(`Atributo no permitido: ${filter.target}`);
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

function quickSearchSql(
    quickSearch: string,
    options: BienesBusquedaQueryOptions,
    addValue: (value: unknown) => string,
): string | null {
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
    const terms = quickSearch.split(/\s+/).filter(Boolean);
    return `(${terms.map((term) => {
        const parameter = addValue(term);
        return `(${candidates.map((field) =>
            `coalesce(b.${quoteIdentifier(sqlFieldName(field, options))}::text, '') ILIKE '%' || ${parameter} || '%'`
        ).join(' OR ')})`;
    }).join(' AND ')})`;
}

export function buildBienesBusquedaQueries(
    requestValue: BienesBusquedaRequest | unknown,
    options: BienesBusquedaQueryOptions,
): BienesBusquedaQueries {
    const request = parseBienesBusquedaRequest(requestValue);
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
    const quickCondition = quickSearchSql(request.quickSearch, options, addValue);
    if (quickCondition) {
        where.push(quickCondition);
    }
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
    const cte = `WITH bienes_filtrados AS (
        SELECT b.*
          FROM (${options.baseSql}) b
         WHERE ${where.join('\n           AND ')}
    )`;
    const countSql = `${cte}
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
               ), '[]'::jsonb) AS atributos
          FROM bienes_filtrados bf
         ORDER BY ${orderBy}${paginationSql}`;
    return {
        dataSql,
        countSql,
        filterValues: [...filterValues],
        dataValues,
        countValues: [...filterValues],
    };
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

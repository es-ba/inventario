export type BienesBusquedaEstado = 'activo' | 'baja' | 'todos';
export type BienesBusquedaLogicOperator = 'and' | 'or';
export type BienesBusquedaSource = 'field' | 'attribute';
export type BienesBusquedaOperator =
    | 'contains'
    | 'equals'
    | 'not_equals'
    | 'starts_with'
    | 'ends_with'
    | 'empty'
    | 'not_empty'
    | 'greater_than'
    | 'greater_or_equal'
    | 'less_than'
    | 'less_or_equal'
    | 'between';

export type BienesBusquedaFilter = {
    source: BienesBusquedaSource;
    target: string;
    operator: BienesBusquedaOperator;
    value?: unknown;
    valueTo?: unknown;
};

export type BienesBusquedaSort = {
    field: string;
    sort: 'asc' | 'desc';
};

export type BienesBusquedaRequest = {
    estado: BienesBusquedaEstado;
    logicOperator: BienesBusquedaLogicOperator;
    filters: BienesBusquedaFilter[];
    quickSearch: string;
    gridFilters: BienesBusquedaFilter[];
    page: number;
    pageSize: 10 | 25 | 50 | 100;
    sortModel: BienesBusquedaSort[];
};

export type BienAtributoResumen = {
    atributo: string;
    nombre?: string;
    valor: string;
};

export type BienesBusquedaRow = Record<string, unknown> & {
    ficha: string;
    atributos: BienAtributoResumen[];
};

export type BienesBusquedaResponse = {
    rows: BienesBusquedaRow[];
    total: number;
};

export type BienesBusquedaExportResponse = {
    fileName: string;
    csv: string;
};

export type BienesAtributoOpcion = {
    atributo: string;
    nombre?: string;
    tipo_valor?: string;
};

export type BienesAtributosOpcionesResponse = {
    rows: BienesAtributoOpcion[];
};

export type BienesAtributoValorOpcion = {
    atributo: string;
    valor: string;
    orden?: number;
};

export type BienesAtributoValoresOpcionesResponse = {
    rows: BienesAtributoValorOpcion[];
};

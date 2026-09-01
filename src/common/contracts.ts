
import {DefinedType, is} from 'guarantee-type';

export type DireccionAccion = 'avance' | 'retroceso' | 'blanqueo'

export type EstadoAccion = {
    operativo: string
    estado: string
    eaccion: string
    condicion: string
    estado_destino: string
    eaccion_direccion: DireccionAccion
    path_icono_svg: string
    nombre_procedure: string
    nombre_wscreen: string
    desactiva_boton: boolean
    confirma: boolean
    abr_eaccion?: string | null
    desc_eaccion?: string | null
}

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

const bienAtributoResumenDescription = {
    atributo:is.string,
    nombre:is.optional.string,
    valor:is.string,
};

const bienesBusquedaRowDescription = {
    ficha:is.string,
    grupo:is.nullable.string,
    marca:is.nullable.string,
    rubro:is.nullable.string,
    clase:is.nullable.string,
    cuenta:is.nullable.string,
    responsable:is.nullable.string,
    sector:is.nullable.string,
    sede:is.nullable.string,
    espacio:is.nullable.string,
    tipo_asignacion:is.nullable.string,
    modalidad_uso:is.nullable.string,
    enusode:is.nullable.string,
    atributos:is.array.object(bienAtributoResumenDescription),
};

export const bien_busqueda = {
    table:'bienes',
    description:is.object(bienesBusquedaRowDescription),
};

export type BienAtributoResumen = DefinedType<
    ReturnType<typeof is.object<typeof bienAtributoResumenDescription>>
>;
export type BienesBusquedaRow = DefinedType<typeof bien_busqueda.description>
    & Record<string, unknown>;

export const bienes_buscar_avanzado = {
    procedure:'bienes_buscar_avanzado',
    parameters:is.object({consulta:is.string}),
    result:is.object({
        rows:is.array.object(bienesBusquedaRowDescription),
        total:is.number,
    }),
};

export type BienesBuscarAvanzadoParameters = DefinedType<
    typeof bienes_buscar_avanzado.parameters
>;
export type BienesBusquedaResponse = Omit<
    DefinedType<typeof bienes_buscar_avanzado.result>,
    'rows'
> & {rows:BienesBusquedaRow[]};

export const bienes_busqueda_exportar = {
    procedure:'bienes_busqueda_exportar',
    parameters:is.object({consulta:is.string}),
    result:is.object({
        fileName:is.string,
        csv:is.string,
    }),
};

export type BienesBusquedaExportarParameters = DefinedType<
    typeof bienes_busqueda_exportar.parameters
>;
export type BienesBusquedaExportResponse = DefinedType<
    typeof bienes_busqueda_exportar.result
>;

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

export const info_usuario = {
    procedure: 'info_usuario',
    result: is.object({
        usuario: is.string,
        rol: is.string,
        nombre: is.nullable.string,
        apellido: is.nullable.string,
        responsable: is.nullable.string,
        sector: is.nullable.string,
        puede_ver_todo: is.nullable.boolean,
        puede_ver_propio: is.nullable.boolean,
        puede_ver_dependientes: is.nullable.boolean,
        puede_ver_claves: is.nullable.boolean,
        puede_restaurar_baja: is.nullable.boolean,
        puede_eliminar: is.nullable.boolean,
        puede_guardar: is.nullable.boolean,
        puede_mover: is.nullable.boolean,
    })
}

export type InfoUsuario = DefinedType<typeof info_usuario.result>

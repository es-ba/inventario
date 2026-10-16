import type {BienesAgrupadoFila, GrupoFiltro, GrupoFiltroElegido} from '../../../common/bienes-agrupar';
import type {BienesBusquedaRequest} from '../../../common/contracts';
import {textoSinCodigo} from '../columnas-busqueda';

export const DIMENSIONES_DEL_REPORTE = ['categoria', 'subcategoria', 'grupo', 'estado', 'en_uso'] as const;

export const DIMENSIONES_DE_TIPOS = ['categoria', 'subcategoria', 'grupo', 'tipo_asignacion'] as const;

export const TIPO_ASIGNACION = {dimension:'tipo_asignacion', etiqueta:'tipo de asignación'} as const;

export const EN_USO = {dimension:'en_uso', valor:'SI', texto:'Sí', etiqueta:'en uso de un responsable', titulo:'En uso'} as const;

export const OTROS = '__otros__';

export const SIN_DATO = '(sin dato)';

export type CategoriaDeCatalogo = {categoria:string, nombre:string, orden:number|null, aparte:boolean};

export type EstadoDeCatalogo = {estado:string, etiqueta:string, descripcion:string|null, orden:number|null};

export type ColumnaDeEstado = {clave:string, etiqueta:string, descripcion:string|null};

export type Cuenta = {total:number, enUso:number, porEstado:Record<string, number>, porTipo:Record<string, number>};

export type TipoDeCatalogo = {tipo:string, descripcion:string, orden:number|null};

export type ColumnaDeTipo = {clave:string, etiqueta:string};

export type FilaDeGrupo = {grupo:string|null, nombre:string, cuenta:Cuenta};

export type FilaDeSubcategoria = {subcategoria:string|null, nombre:string, cuenta:Cuenta, grupos:FilaDeGrupo[]};

export type FilaDeCategoria = {
    categoria:string|null,
    nombre:string,
    cuenta:Cuenta,
    subcategorias:FilaDeSubcategoria[],
    proporcion:number,
};

export type Reporte = {
    columnas:ColumnaDeEstado[],
    tipos:ColumnaDeTipo[],
    principal:FilaDeCategoria[],
    aparte:FilaDeCategoria[],
    totalPrincipal:Cuenta,
    totalAparte:Cuenta,
    total:Cuenta,
};

export type FiltroPrevio = {dimension:string, valor:string|null, texto:string, etiqueta:string};

export const FILTROS_DEL_REPORTE = [
    {dimension:'sector', etiqueta:'sector', titulo:'Sector'},
    {dimension:'enusode_responsable', etiqueta:'en uso de', titulo:'En uso de'},
] as const;

export function cuentaVacia():Cuenta{
    return {total:0, enUso:0, porEstado:{}, porTipo:{}};
}

export function sumar(cuenta:Cuenta, clave:string, cantidad:number, enUso:number){
    cuenta.total += cantidad;
    cuenta.enUso += enUso;
    cuenta.porEstado[clave] = (cuenta.porEstado[clave] ?? 0) + cantidad;
}

export function sumarTipo(cuenta:Cuenta, tipo:string, cantidad:number){
    cuenta.porTipo[tipo] = (cuenta.porTipo[tipo] ?? 0) + cantidad;
}

export function sumarCuentas(cuentas:Cuenta[]):Cuenta{
    const suma = cuentaVacia();
    for(const cuenta of cuentas){
        for(const [clave, cantidad] of Object.entries(cuenta.porEstado)){
            sumar(suma, clave, cantidad, 0);
        }
        for(const [tipo, cantidad] of Object.entries(cuenta.porTipo)){
            sumarTipo(suma, tipo, cantidad);
        }
        suma.enUso += cuenta.enUso;
    }
    return suma;
}

export function columnasDeTipos(tipos:TipoDeCatalogo[]):ColumnaDeTipo[]{
    return tipos.filter(tipo => tipo.orden != null)
        .sort((a, b) => a.orden! - b.orden! || a.tipo.localeCompare(b.tipo))
        .map(tipo => ({clave:tipo.tipo, etiqueta:tipo.descripcion || tipo.tipo}));
}

function porOrdenYCodigo<T>(orden:(x:T) => number|null, codigo:(x:T) => string){
    return (a:T, b:T) => (orden(a) ?? Infinity) - (orden(b) ?? Infinity) || codigo(a).localeCompare(codigo(b));
}

function conProporcion(filas:FilaDeCategoria[], total:number):FilaDeCategoria[]{
    return filas.map(fila => ({...fila, proporcion:total ? fila.cuenta.total / total : 0}));
}

export function porcentaje(proporcion:number):string{
    const decimales = proporcion < 0.1 ? 1 : 0;
    const valor = Math.round(proporcion * 100 * 10 ** decimales) / 10 ** decimales;
    return proporcion > 0 && valor === 0 ? '< 0,1 %' : `${String(valor).replace('.', ',')} %`;
}

export type CriterioDeEstados = {
    claveDe:(estado:string|null) => string,
    columnas:(hayOtros:boolean) => ColumnaDeEstado[],
};

export function criterioDeEstados(estados:EstadoDeCatalogo[]):CriterioDeEstados{
    const conOrden = estados.filter(estado => estado.orden != null)
        .sort(porOrdenYCodigo(estado => estado.orden, estado => estado.estado));
    const columnasConOrden = new Set(conOrden.map(estado => estado.estado));
    return {
        claveDe:estado => estado != null && columnasConOrden.has(estado) ? estado : OTROS,
        columnas:hayOtros => [
            ...conOrden.map(estado => ({clave:estado.estado, etiqueta:estado.etiqueta || estado.estado, descripcion:estado.descripcion})),
            ...(hayOtros ? [{clave:OTROS, etiqueta:'Otros', descripcion:'Estados que no tienen orden en el catálogo'}] : []),
        ],
    };
}

export function armarReporte(
    filas:BienesAgrupadoFila[],
    categorias:CategoriaDeCatalogo[],
    estados:EstadoDeCatalogo[],
    filasDeTipos:BienesAgrupadoFila[] = [],
    tipos:TipoDeCatalogo[] = [],
):Reporte{
    const criterio = criterioDeEstados(estados);
    const claveDeEstado = criterio.claveDe;
    const catalogo = new Map(categorias.map(categoria => [categoria.categoria, categoria]));
    const porCategoria = new Map<string|null, {cuenta:Cuenta, subcategorias:Map<string|null, FilaDeSubcategoria & {porGrupo:Map<string|null, FilaDeGrupo>}>}>();
    let hayOtros = false;
    for(const {valores:[categoria = null, subcategoria = null, grupo = null, estado = null, enUso = null], textos, cantidad} of filas){
        const clave = claveDeEstado(estado);
        const deEnUso = enUso === EN_USO.valor ? cantidad : 0;
        hayOtros ||= clave === OTROS;
        let deCategoria = porCategoria.get(categoria);
        if(!deCategoria){
            deCategoria = {cuenta:cuentaVacia(), subcategorias:new Map()};
            porCategoria.set(categoria, deCategoria);
        }
        sumar(deCategoria.cuenta, clave, cantidad, deEnUso);
        let sub = deCategoria.subcategorias.get(subcategoria);
        if(!sub){
            sub = {
                subcategoria,
                nombre:subcategoria == null ? SIN_DATO : textoSinCodigo(textos[1] ?? subcategoria, subcategoria),
                cuenta:cuentaVacia(),
                grupos:[],
                porGrupo:new Map(),
            };
            deCategoria.subcategorias.set(subcategoria, sub);
        }
        sumar(sub.cuenta, clave, cantidad, deEnUso);
        let deGrupo = sub.porGrupo.get(grupo);
        if(!deGrupo){
            deGrupo = {grupo, nombre:grupo == null ? SIN_DATO : textoSinCodigo(textos[2] ?? grupo, grupo), cuenta:cuentaVacia()};
            sub.porGrupo.set(grupo, deGrupo);
        }
        sumar(deGrupo.cuenta, clave, cantidad, deEnUso);
    }
    for(const {valores:[categoria = null, subcategoria = null, grupo = null, tipo = null], cantidad} of filasDeTipos){
        const deCategoria = porCategoria.get(categoria);
        const sub = deCategoria?.subcategorias.get(subcategoria);
        const deGrupo = sub?.porGrupo.get(grupo);
        if(tipo == null || !deCategoria || !sub || !deGrupo){ continue; }
        for(const cuenta of [deCategoria.cuenta, sub.cuenta, deGrupo.cuenta]){
            sumarTipo(cuenta, tipo, cantidad);
        }
    }
    const filasDeCategoria = [...porCategoria].map(([categoria, {cuenta, subcategorias}]):FilaDeCategoria & {aparte:boolean, orden:number|null} => {
        const delCatalogo = categoria == null ? undefined : catalogo.get(categoria);
        return {
            categoria,
            nombre:categoria == null ? 'Sin categoría' : delCatalogo?.nombre ?? categoria,
            cuenta,
            subcategorias:[...subcategorias.values()].sort((a, b) =>
                a.subcategoria == null ? 1 : b.subcategoria == null ? -1 : a.subcategoria.localeCompare(b.subcategoria))
                .map(({porGrupo, ...sub}) => ({...sub, grupos:[...porGrupo.values()].sort((a, b) =>
                    a.grupo == null ? 1 : b.grupo == null ? -1 : b.cuenta.total - a.cuenta.total || a.nombre.localeCompare(b.nombre))})),
            proporcion:0,
            aparte:delCatalogo?.aparte ?? false,
            orden:categoria == null ? null : delCatalogo?.orden ?? null,
        };
    });
    const ordenar = (lista:typeof filasDeCategoria) => lista
        .sort((a, b) => a.categoria == null ? 1 : b.categoria == null ? -1
            : porOrdenYCodigo<typeof a>(x => x.orden, x => x.categoria ?? '')(a, b))
        .map(({aparte:_aparte, orden:_orden, ...fila}) => fila);
    const totalGeneral = filasDeCategoria.reduce((suma, fila) => suma + fila.cuenta.total, 0);
    const principal = conProporcion(ordenar(filasDeCategoria.filter(fila => !fila.aparte)), totalGeneral);
    const aparte = conProporcion(ordenar(filasDeCategoria.filter(fila => fila.aparte)), totalGeneral);
    const totalPrincipal = sumarCuentas(principal.map(fila => fila.cuenta));
    const totalAparte = sumarCuentas(aparte.map(fila => fila.cuenta));
    return {
        columnas:criterio.columnas(hayOtros),
        tipos:columnasDeTipos(tipos),
        principal,
        aparte,
        totalPrincipal,
        totalAparte,
        total:sumarCuentas([totalPrincipal, totalAparte]),
    };
}

export function consultaDelReporte(previos:FiltroPrevio[], agruparPor:readonly string[] = DIMENSIONES_DEL_REPORTE):BienesBusquedaRequest{
    return {
        estado:'activo',
        logicOperator:'and',
        filters:[],
        quickSearch:'',
        gridFilters:[],
        page:0,
        pageSize:100,
        sortModel:[],
        agruparPor:[...agruparPor],
        ...(previos.length ? {grupoFiltro:previos.map(({dimension, valor}) => ({dimension, valor}))} : {}),
    };
}

export type Celda = {
    previos:FiltroPrevio[],
    categoria?:{valor:string|null, nombre:string},
    subcategoria?:{valor:string|null, nombre:string},
    grupo?:{valor:string|null, nombre:string},
    estado?:ColumnaDeEstado,
    enUso?:boolean,
    tipo?:ColumnaDeTipo,
};

export function filtroDeCelda({previos, categoria, subcategoria, grupo, estado, enUso, tipo}:Celda):GrupoFiltroElegido|null{
    if(estado?.clave === OTROS){
        return null;
    }
    const partes:GrupoFiltro[] = [];
    const textos:string[] = [];
    const etiquetas:string[] = [];
    const agregar = (dimension:string, valor:string|null, texto:string, etiqueta:string, textoFijo = false) => {
        partes.push({dimension, valor});
        textos.push(valor == null && !textoFijo ? SIN_DATO : texto);
        etiquetas.push(etiqueta);
    };
    for(const previo of previos){ agregar(previo.dimension, previo.valor, previo.texto, previo.etiqueta, true); }
    if(subcategoria){ agregar('subcategoria', subcategoria.valor, subcategoria.nombre, 'subcategoría'); }
    else if(categoria){ agregar('categoria', categoria.valor, categoria.nombre, 'categoría'); }
    if(grupo){ agregar('grupo', grupo.valor, grupo.nombre, 'grupo'); }
    if(estado){ agregar('estado', estado.clave, estado.etiqueta, 'estado'); }
    if(enUso){ agregar(EN_USO.dimension, EN_USO.valor, EN_USO.texto, EN_USO.etiqueta); }
    if(tipo){ agregar(TIPO_ASIGNACION.dimension, tipo.clave, tipo.etiqueta, TIPO_ASIGNACION.etiqueta); }
    return partes.length ? {partes, textos, etiquetas} : null;
}

export type OpcionDeFiltro = {valor:string, texto:string, etiqueta:string};

export function opcionesDeAgrupado(filas:BienesAgrupadoFila[]):OpcionDeFiltro[]{
    return filas
        .filter(fila => fila.valores[0] != null)
        .map(fila => {
            const valor = fila.valores[0] as string;
            const texto = textoSinCodigo(fila.textos[0] ?? valor, valor) || valor;
            return {valor, texto, etiqueta:`${texto} (${fila.cantidad})`};
        })
        .sort((a, b) => a.texto.localeCompare(b.texto));
}

export function opcionesDeSectores(filas:Record<string, unknown>[]):OpcionDeFiltro[]{
    const texto = (valor:unknown) => valor == null ? '' : String(valor).trim();
    return filas
        .filter(fila => fila.activo !== false)
        .map(fila => {
            const sector = texto(fila.sector);
            const sigla = texto(fila.sigla);
            const nombre = texto(fila.nombre_sector);
            const responsable = [texto(fila.responsables__apellido), texto(fila.responsables__nombre)].filter(Boolean).join(', ');
            const delSector = [sigla, nombre].filter(Boolean).join(' — ') || sector;
            return {
                valor:sector,
                texto:sigla || nombre || sector,
                etiqueta:responsable ? `${delSector} · ${responsable}` : delSector,
            };
        })
        .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
}

export function hashDeBusqueda(filtro:GrupoFiltroElegido|null):string{
    return filtro ? `w=principal&filtro=${encodeURIComponent(JSON.stringify(filtro))}` : 'w=principal';
}

export function campoCsv(valor:string|number):string{
    const texto = String(valor);
    return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function csvDelReporte(reporte:Reporte):string{
    const numeros = (cuenta:Cuenta) => [cuenta.total, ...reporte.columnas.map(columna => cuenta.porEstado[columna.clave] ?? 0), cuenta.enUso,
        ...reporte.tipos.map(tipo => cuenta.porTipo[tipo.clave] ?? 0)];
    const lineas:(string|number)[][] = [['Categoría', 'Subcategoría', 'Grupo', 'Total', ...reporte.columnas.map(columna => columna.etiqueta), EN_USO.titulo,
        ...reporte.tipos.map(tipo => tipo.etiqueta)]];
    const bloque = (filas:FilaDeCategoria[]) => {
        for(const categoria of filas){
            for(const sub of categoria.subcategorias){
                for(const grupo of sub.grupos){
                    lineas.push([categoria.nombre, sub.nombre, grupo.nombre, ...numeros(grupo.cuenta)]);
                }
            }
        }
    };
    bloque(reporte.principal);
    lineas.push(['Total principal', '', '', ...numeros(reporte.totalPrincipal)]);
    if(reporte.aparte.length){
        bloque(reporte.aparte);
        lineas.push(['Total aparte', '', '', ...numeros(reporte.totalAparte)]);
    }
    lineas.push(['Total general', '', '', ...numeros(reporte.total)]);
    return '﻿' + lineas.map(linea => linea.map(campoCsv).join(';')).join('\r\n') + '\r\n';
}

export function nombreDelCsv(previos:FiltroPrevio[], fecha:Date, prefijo = 'bienes-por-categoria'):string{
    const dia = [fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate()].map(n => String(n).padStart(2, '0')).join('-');
    const deLosFiltros = previos.map(previo => `-${(previo.valor ?? 'sin-dato').replace(/[^\w-]+/g, '_')}`).join('');
    return `${prefijo}${deLosFiltros}-${dia}.csv`;
}

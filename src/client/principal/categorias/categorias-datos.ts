import type {BienesAgrupadoFila, GrupoFiltro, GrupoFiltroElegido} from '../../../common/bienes-agrupar';
import type {BienesBusquedaRequest} from '../../../common/contracts';
import {textoSinCodigo} from '../columnas-busqueda';

export const DIMENSIONES_DEL_REPORTE = ['categoria', 'subcategoria', 'estado'] as const;

export const OTROS = '__otros__';

export const SIN_DATO = '(sin dato)';

export type CategoriaDeCatalogo = {categoria:string, nombre:string, orden:number|null, aparte:boolean};

export type EstadoDeCatalogo = {estado:string, etiqueta:string, descripcion:string|null, orden:number|null};

export type ColumnaDeEstado = {clave:string, etiqueta:string, descripcion:string|null};

export type Cuenta = {total:number, porEstado:Record<string, number>};

export type FilaDeSubcategoria = {subcategoria:string|null, nombre:string, cuenta:Cuenta};

export type FilaDeCategoria = {
    categoria:string|null,
    nombre:string,
    cuenta:Cuenta,
    subcategorias:FilaDeSubcategoria[],
    proporcion:number,
};

export type Reporte = {
    columnas:ColumnaDeEstado[],
    principal:FilaDeCategoria[],
    aparte:FilaDeCategoria[],
    totalPrincipal:Cuenta,
    totalAparte:Cuenta,
    total:Cuenta,
};

export type SectorElegido = {sector:string, texto:string};

function cuentaVacia():Cuenta{
    return {total:0, porEstado:{}};
}

function sumar(cuenta:Cuenta, clave:string, cantidad:number){
    cuenta.total += cantidad;
    cuenta.porEstado[clave] = (cuenta.porEstado[clave] ?? 0) + cantidad;
}

function sumarCuentas(cuentas:Cuenta[]):Cuenta{
    const suma = cuentaVacia();
    for(const cuenta of cuentas){
        for(const [clave, cantidad] of Object.entries(cuenta.porEstado)){
            sumar(suma, clave, cantidad);
        }
    }
    return suma;
}

function porOrdenYCodigo<T>(orden:(x:T) => number|null, codigo:(x:T) => string){
    return (a:T, b:T) => (orden(a) ?? Infinity) - (orden(b) ?? Infinity) || codigo(a).localeCompare(codigo(b));
}

function conProporcion(filas:FilaDeCategoria[]):FilaDeCategoria[]{
    const mayor = Math.max(0, ...filas.map(fila => fila.cuenta.total));
    return filas.map(fila => ({...fila, proporcion:mayor ? fila.cuenta.total / mayor : 0}));
}

export function armarReporte(
    filas:BienesAgrupadoFila[],
    categorias:CategoriaDeCatalogo[],
    estados:EstadoDeCatalogo[],
):Reporte{
    const conOrden = estados.filter(estado => estado.orden != null)
        .sort(porOrdenYCodigo(estado => estado.orden, estado => estado.estado));
    const columnasConOrden = new Set(conOrden.map(estado => estado.estado));
    const claveDeEstado = (estado:string|null) => estado != null && columnasConOrden.has(estado) ? estado : OTROS;
    const catalogo = new Map(categorias.map(categoria => [categoria.categoria, categoria]));
    const porCategoria = new Map<string|null, {cuenta:Cuenta, subcategorias:Map<string|null, FilaDeSubcategoria>}>();
    let hayOtros = false;
    for(const {valores:[categoria = null, subcategoria = null, estado = null], textos, cantidad} of filas){
        const clave = claveDeEstado(estado);
        hayOtros ||= clave === OTROS;
        let grupo = porCategoria.get(categoria);
        if(!grupo){
            grupo = {cuenta:cuentaVacia(), subcategorias:new Map()};
            porCategoria.set(categoria, grupo);
        }
        sumar(grupo.cuenta, clave, cantidad);
        let sub = grupo.subcategorias.get(subcategoria);
        if(!sub){
            sub = {
                subcategoria,
                nombre:subcategoria == null ? SIN_DATO : textoSinCodigo(textos[1] ?? subcategoria, subcategoria),
                cuenta:cuentaVacia(),
            };
            grupo.subcategorias.set(subcategoria, sub);
        }
        sumar(sub.cuenta, clave, cantidad);
    }
    const filasDeCategoria = [...porCategoria].map(([categoria, {cuenta, subcategorias}]):FilaDeCategoria & {aparte:boolean, orden:number|null} => {
        const delCatalogo = categoria == null ? undefined : catalogo.get(categoria);
        return {
            categoria,
            nombre:categoria == null ? 'Sin categoría' : delCatalogo?.nombre ?? categoria,
            cuenta,
            subcategorias:[...subcategorias.values()].sort((a, b) =>
                a.subcategoria == null ? 1 : b.subcategoria == null ? -1 : a.subcategoria.localeCompare(b.subcategoria)),
            proporcion:0,
            aparte:delCatalogo?.aparte ?? false,
            orden:categoria == null ? null : delCatalogo?.orden ?? null,
        };
    });
    const ordenar = (lista:typeof filasDeCategoria) => lista
        .sort((a, b) => a.categoria == null ? 1 : b.categoria == null ? -1
            : porOrdenYCodigo<typeof a>(x => x.orden, x => x.categoria ?? '')(a, b))
        .map(({aparte:_aparte, orden:_orden, ...fila}) => fila);
    const principal = conProporcion(ordenar(filasDeCategoria.filter(fila => !fila.aparte)));
    const aparte = conProporcion(ordenar(filasDeCategoria.filter(fila => fila.aparte)));
    const totalPrincipal = sumarCuentas(principal.map(fila => fila.cuenta));
    const totalAparte = sumarCuentas(aparte.map(fila => fila.cuenta));
    return {
        columnas:[
            ...conOrden.map(estado => ({clave:estado.estado, etiqueta:estado.etiqueta || estado.estado, descripcion:estado.descripcion})),
            ...(hayOtros ? [{clave:OTROS, etiqueta:'Otros', descripcion:'Estados que no tienen orden en el catálogo'}] : []),
        ],
        principal,
        aparte,
        totalPrincipal,
        totalAparte,
        total:sumarCuentas([totalPrincipal, totalAparte]),
    };
}

export function consultaDelReporte(sector:SectorElegido|null):BienesBusquedaRequest{
    return {
        estado:'activo',
        logicOperator:'and',
        filters:[],
        quickSearch:'',
        gridFilters:[],
        page:0,
        pageSize:100,
        sortModel:[],
        agruparPor:[...DIMENSIONES_DEL_REPORTE],
        ...(sector ? {grupoFiltro:[{dimension:'sector', valor:sector.sector}]} : {}),
    };
}

export type Celda = {
    sector:SectorElegido|null,
    categoria?:{valor:string|null, nombre:string},
    subcategoria?:{valor:string|null, nombre:string},
    estado?:ColumnaDeEstado,
};

export function filtroDeCelda({sector, categoria, subcategoria, estado}:Celda):GrupoFiltroElegido|null{
    if(estado?.clave === OTROS){
        return null;
    }
    const partes:GrupoFiltro[] = [];
    const textos:string[] = [];
    const etiquetas:string[] = [];
    const agregar = (dimension:string, valor:string|null, texto:string, etiqueta:string) => {
        partes.push({dimension, valor});
        textos.push(valor == null ? SIN_DATO : texto);
        etiquetas.push(etiqueta);
    };
    if(sector){ agregar('sector', sector.sector, sector.texto, 'sector'); }
    if(subcategoria){ agregar('subcategoria', subcategoria.valor, subcategoria.nombre, 'subcategoría'); }
    else if(categoria){ agregar('categoria', categoria.valor, categoria.nombre, 'categoría'); }
    if(estado){ agregar('estado', estado.clave, estado.etiqueta, 'estado'); }
    return partes.length ? {partes, textos, etiquetas} : null;
}

export function hashDeBusqueda(filtro:GrupoFiltroElegido|null):string{
    return filtro ? `w=principal&filtro=${encodeURIComponent(JSON.stringify(filtro))}` : 'w=principal';
}

function campoCsv(valor:string|number):string{
    const texto = String(valor);
    return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function csvDelReporte(reporte:Reporte):string{
    const numeros = (cuenta:Cuenta) => [cuenta.total, ...reporte.columnas.map(columna => cuenta.porEstado[columna.clave] ?? 0)];
    const lineas:(string|number)[][] = [['Categoría', 'Subcategoría', 'Total', ...reporte.columnas.map(columna => columna.etiqueta)]];
    const bloque = (filas:FilaDeCategoria[]) => {
        for(const categoria of filas){
            for(const sub of categoria.subcategorias){
                lineas.push([categoria.nombre, sub.nombre, ...numeros(sub.cuenta)]);
            }
        }
    };
    bloque(reporte.principal);
    lineas.push(['Total principal', '', ...numeros(reporte.totalPrincipal)]);
    if(reporte.aparte.length){
        bloque(reporte.aparte);
        lineas.push(['Total aparte', '', ...numeros(reporte.totalAparte)]);
    }
    lineas.push(['Total general', '', ...numeros(reporte.total)]);
    return '﻿' + lineas.map(linea => linea.map(campoCsv).join(';')).join('\r\n') + '\r\n';
}

export function nombreDelCsv(sector:SectorElegido|null, fecha:Date):string{
    const dia = [fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate()].map(n => String(n).padStart(2, '0')).join('-');
    const delSector = sector ? `-${sector.sector.replace(/[^\w-]+/g, '_')}` : '';
    return `bienes-por-categoria${delSector}-${dia}.csv`;
}

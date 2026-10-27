import {
    PREFIJO_ATRIBUTO, claveDeAtributo, type BienesAgrupadoFila, type FiltroDeLista, type GrupoFiltro, type GrupoFiltroElegido,
} from '../../../common/bienes-agrupar';
import {textoSinCodigo} from '../columnas-busqueda';
import {
    EN_USO, OTROS, TIPO_ASIGNACION, campoCsv, columnasDeTipos, criterioDeEstados, cuentaVacia, hashDeBusqueda, porOrdenYCodigo, sumar, sumarCuentas, sumarTipo,
    type CategoriaDeCatalogo, type ColumnaDeEstado, type ColumnaDeTipo, type Cuenta, type EstadoDeCatalogo, type FiltroPrevio,
    type TipoDeCatalogo,
} from '../categorias/categorias-datos';

export type SubcategoriaDeCatalogo = {subcategoria:string, nombre:string, categoria:string};

export type AtributoDeCatalogo = {atributo:string, nombre:string};

export type CampoDelBien = {dimension:string, etiqueta:string};

export const MARCA:CampoDelBien = {dimension:'marca', etiqueta:'Marca'};

export function campoDeAtributo(atributo:AtributoDeCatalogo):CampoDelBien{
    return {dimension:claveDeAtributo(atributo.atributo), etiqueta:atributo.nombre || atributo.atributo};
}

export function camposDelReporte(atributos:AtributoDeCatalogo[]):CampoDelBien[]{
    return [MARCA, ...atributos.map(campoDeAtributo)];
}

export const DIMENSIONES_DE_LA_TABLA = ['subcategoria', 'estado', 'en_uso'];

export const DIMENSIONES_DE_TIPOS_DE_LA_TABLA = ['subcategoria', 'tipo_asignacion'];

export const SIN_CATEGORIA = 'Sin categoría';
export const SIN_SUBCATEGORIA = '(sin subcategoría)';
export const SIN_DATO = '(sin dato)';

export type Nivel = 'categoria' | 'subcategoria';

const NIVELES:Nivel[] = ['categoria', 'subcategoria'];

export type Paso = {valor:string|null, nombre:string};

export type NodoDeModelos = {
    id:string,
    nivel:Nivel,
    profundidad:number,
    valor:string|null,
    nombre:string,
    camino:Partial<Record<Nivel, Paso>>,
    cuenta:Cuenta,
    proporcion:number,
    hijos:NodoDeModelos[],
};

export type ArbolDeModelos = {raices:NodoDeModelos[], total:Cuenta, columnas:ColumnaDeEstado[], tipos:ColumnaDeTipo[]};

type Armado = NodoDeModelos & {porValor:Map<string|null, Armado>};

const idDe = (camino:Partial<Record<Nivel, Paso>>) => JSON.stringify(NIVELES.filter(nivel => camino[nivel]).map(nivel => camino[nivel]!.valor));

function hijoDe(padre:{porValor:Map<string|null, Armado>, camino?:Partial<Record<Nivel, Paso>>}, nivel:Nivel, valor:string|null, nombre:() => string):Armado{
    let hijo = padre.porValor.get(valor);
    if(!hijo){
        const camino = {...padre.camino, [nivel]:{valor, nombre:nombre()}};
        hijo = {
            id:idDe(camino), nivel, profundidad:NIVELES.indexOf(nivel), valor, nombre:camino[nivel]!.nombre, camino,
            cuenta:cuentaVacia(), proporcion:0, hijos:[], porValor:new Map(),
        };
        padre.porValor.set(valor, hijo);
    }
    return hijo;
}

export function armarArbolDeModelos(
    filas:BienesAgrupadoFila[],
    deTipos:BienesAgrupadoFila[],
    subcategorias:SubcategoriaDeCatalogo[],
    categorias:CategoriaDeCatalogo[],
    estados:EstadoDeCatalogo[],
    tipos:TipoDeCatalogo[] = [],
):ArbolDeModelos{
    const criterio = criterioDeEstados(estados);
    const deSubcategoria = new Map(subcategorias.map(sub => [sub.subcategoria, sub]));
    const deCategoria = new Map(categorias.map(categoria => [categoria.categoria, categoria]));
    const raiz = {porValor:new Map<string|null, Armado>()};
    let hayOtros = false;
    const ubicar = (subcategoria:string|null) => {
        const sub = subcategoria == null ? undefined : deSubcategoria.get(subcategoria);
        const categoria = sub?.categoria ?? null;
        const nodoCategoria = hijoDe(raiz, 'categoria', categoria, () =>
            categoria == null ? SIN_CATEGORIA : deCategoria.get(categoria)?.nombre || categoria);
        const nodoSubcategoria = hijoDe(nodoCategoria, 'subcategoria', subcategoria, () =>
            subcategoria == null ? SIN_SUBCATEGORIA : sub?.nombre || subcategoria);
        return [nodoCategoria, nodoSubcategoria];
    };
    for(const {valores:[subcategoria = null, estado = null, enUso = null], cantidad} of filas){
        const clave = criterio.claveDe(estado);
        hayOtros ||= clave === OTROS;
        for(const nodo of ubicar(subcategoria)){
            sumar(nodo.cuenta, clave, cantidad, enUso === EN_USO.valor ? cantidad : 0);
        }
    }
    for(const {valores:[subcategoria = null, tipo = null], cantidad} of deTipos){
        if(tipo == null){ continue; }
        for(const nodo of ubicar(subcategoria)){
            sumarTipo(nodo.cuenta, tipo, cantidad);
        }
    }
    const total = sumarCuentas([...raiz.porValor.values()].map(nodo => nodo.cuenta));
    const terminar = ({porValor, ...nodo}:Armado):NodoDeModelos => ({
        ...nodo,
        proporcion:total.total ? nodo.cuenta.total / total.total : 0,
        hijos:[...porValor.values()].filter(hijo => hijo.cuenta.total > 0).sort((a, b) =>
            a.valor == null ? 1 : b.valor == null ? -1 : b.cuenta.total - a.cuenta.total || a.nombre.localeCompare(b.nombre)).map(terminar),
    });
    const porOrdenDeCategoria = porOrdenYCodigo<Armado>(nodo => deCategoria.get(nodo.valor!)?.orden ?? null, nodo => nodo.valor!);
    const raices = [...raiz.porValor.values()].filter(nodo => nodo.cuenta.total > 0)
        .sort((a, b) => a.valor == null ? 1 : b.valor == null ? -1 : porOrdenDeCategoria(a, b));
    return {raices:raices.map(terminar), total, columnas:criterio.columnas(hayOtros), tipos:columnasDeTipos(tipos)};
}

export type CeldaDeModelos = {
    previos:FiltroPrevio[],
    filtros?:FiltroDeLista[],
    nodo?:Pick<NodoDeModelos, 'nivel' | 'camino'>,
    estado?:ColumnaDeEstado,
    enUso?:boolean,
    tipo?:ColumnaDeTipo,
};

export function destinoDeCelda(celda:CeldaDeModelos):string|null{
    return celda.estado?.clave === OTROS ? null : hashDeBusqueda(filtroDeCeldaDeModelos(celda), celda.filtros);
}

export function filtroDeCeldaDeModelos({previos, nodo, estado, enUso, tipo}:CeldaDeModelos):GrupoFiltroElegido|null{
    if(estado?.clave === OTROS){
        return null;
    }
    const partes:{parte:GrupoFiltro, texto:string, etiqueta:string}[] = [];
    const agregar = (dimension:string, valor:string|null, texto:string, etiqueta:string) => {
        const nueva = {parte:{dimension, valor}, texto, etiqueta};
        const indice = partes.findIndex(({parte}) => parte.dimension === dimension);
        if(indice < 0){ partes.push(nueva); }else{ partes[indice] = nueva; }
    };
    const conSubcategoria = nodo?.camino.subcategoria != null;
    for(const previo of previos){
        if(!(conSubcategoria && previo.dimension === 'categoria')){
            agregar(previo.dimension, previo.valor, previo.texto, previo.etiqueta);
        }
    }
    if(nodo){
        const {categoria, subcategoria} = nodo.camino;
        if(nodo.nivel === 'categoria' && categoria){ agregar('categoria', categoria.valor, categoria.nombre, 'categoría'); }
        if(subcategoria){ agregar('subcategoria', subcategoria.valor, subcategoria.nombre, 'subcategoría'); }
    }
    if(estado){ agregar('estado', estado.clave, estado.etiqueta, 'estado'); }
    if(enUso){ agregar(EN_USO.dimension, EN_USO.valor, EN_USO.texto, EN_USO.etiqueta); }
    if(tipo){ agregar(TIPO_ASIGNACION.dimension, tipo.clave, tipo.etiqueta, TIPO_ASIGNACION.etiqueta); }
    return partes.length
        ? {partes:partes.map(({parte}) => parte), textos:partes.map(({texto}) => texto), etiquetas:partes.map(({etiqueta}) => etiqueta)}
        : null;
}

export function csvDeModelos(arbol:ArbolDeModelos):string{
    const numeros = (cuenta:Cuenta) => [cuenta.total, ...arbol.columnas.map(columna => cuenta.porEstado[columna.clave] ?? 0), cuenta.enUso,
        ...arbol.tipos.map(tipo => cuenta.porTipo[tipo.clave] ?? 0)];
    const lineas:(string|number)[][] = [[
        'Categoría', 'Subcategoría', 'Total', ...arbol.columnas.map(columna => columna.etiqueta), EN_USO.titulo,
        ...arbol.tipos.map(tipo => tipo.etiqueta),
    ]];
    for(const categoria of arbol.raices){
        for(const subcategoria of categoria.hijos){
            lineas.push([categoria.nombre, subcategoria.nombre, ...numeros(subcategoria.cuenta)]);
        }
    }
    lineas.push(['Total general', '', ...numeros(arbol.total)]);
    return '﻿' + lineas.map(linea => linea.map(campoCsv).join(';')).join('\r\n') + '\r\n';
}

export type Elegidos = Record<string, Paso[]>;

export type ValorDeFaceta = Paso & {cantidad:number, elegido:boolean};

export type Faceta = {campo:CampoDelBien, valores:ValorDeFaceta[]};

export type PedidoDeFacetas = {campos:CampoDelBien[], filtros:FiltroDeLista[]};

export function filtroDeLista(campo:CampoDelBien, pasos:Paso[]):FiltroDeLista{
    const atributo = campo.dimension.startsWith(PREFIJO_ATRIBUTO) ? campo.dimension.slice(PREFIJO_ATRIBUTO.length) : null;
    return {
        source:atributo == null ? 'field' : 'attribute',
        target:atributo ?? campo.dimension,
        operator:'in',
        value:pasos.map(paso => paso.valor),
        targetLabel:campo.etiqueta,
        valueLabels:pasos.map(paso => paso.nombre),
    };
}

export function filtrosDeFacetas(campos:CampoDelBien[], elegidos:Elegidos, salvo?:string):FiltroDeLista[]{
    return campos.filter(campo => campo.dimension !== salvo && elegidos[campo.dimension]?.length)
        .map(campo => filtroDeLista(campo, elegidos[campo.dimension]));
}

export function pedidosDeFacetas(campos:CampoDelBien[], elegidos:Elegidos):PedidoDeFacetas[]{
    const sinElegir = campos.filter(campo => !elegidos[campo.dimension]?.length);
    return [
        ...(sinElegir.length ? [{campos:sinElegir, filtros:filtrosDeFacetas(campos, elegidos)}] : []),
        ...campos.filter(campo => elegidos[campo.dimension]?.length)
            .map(campo => ({campos:[campo], filtros:filtrosDeFacetas(campos, elegidos, campo.dimension)})),
    ];
}

export function armarFacetas(campos:CampoDelBien[], filasPorCampo:Map<string, BienesAgrupadoFila[]>, elegidos:Elegidos):Faceta[]{
    return campos.map(campo => {
        const deEsteCampo = elegidos[campo.dimension] ?? [];
        const esElegido = (valor:string|null) => deEsteCampo.some(paso => paso.valor === valor);
        const valores:ValorDeFaceta[] = (filasPorCampo.get(campo.dimension) ?? []).map(({valores:[valor = null], textos, cantidad}) => ({
            valor,
            nombre:valor == null ? SIN_DATO : textoSinCodigo(textos[0] ?? valor, valor) || valor,
            cantidad,
            elegido:esElegido(valor),
        }));
        for(const paso of deEsteCampo){
            if(!valores.some(valor => valor.valor === paso.valor)){ valores.push({...paso, cantidad:0, elegido:true}); }
        }
        return {campo, valores:valores.sort((a, b) =>
            a.valor == null ? 1 : b.valor == null ? -1 : b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre))};
    }).filter(({valores}) => valores.some(valor => valor.elegido || valor.valor != null && valor.cantidad > 0));
}

export function alternarElegido(elegidos:Elegidos, campo:CampoDelBien, paso:Paso):Elegidos{
    const anteriores = elegidos[campo.dimension] ?? [];
    const pasos = anteriores.some(anterior => anterior.valor === paso.valor)
        ? anteriores.filter(anterior => anterior.valor !== paso.valor)
        : [...anteriores, {valor:paso.valor, nombre:paso.nombre}];
    const {[campo.dimension]:_anteriores, ...otros} = elegidos;
    return pasos.length ? {...otros, [campo.dimension]:pasos} : otros;
}

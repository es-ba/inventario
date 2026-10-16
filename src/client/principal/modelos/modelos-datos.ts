import {claveDeAtributo, type BienesAgrupadoFila, type GrupoFiltro, type GrupoFiltroElegido} from '../../../common/bienes-agrupar';
import {textoSinCodigo} from '../columnas-busqueda';
import {
    EN_USO, OTROS, TIPO_ASIGNACION, campoCsv, columnasDeTipos, criterioDeEstados, cuentaVacia, sumar, sumarCuentas, sumarTipo,
    type CategoriaDeCatalogo, type ColumnaDeEstado, type ColumnaDeTipo, type Cuenta, type EstadoDeCatalogo, type FiltroPrevio,
    type TipoDeCatalogo,
} from '../categorias/categorias-datos';

export type SubcategoriaDeCatalogo = {subcategoria:string, nombre:string, categoria:string};

export type AtributoDeCatalogo = {atributo:string, nombre:string};

export type CampoDelBien = {dimension:string, etiqueta:string};

export const MARCA:CampoDelBien = {dimension:'marca', etiqueta:'Marca'};
export const MODELO:CampoDelBien = {dimension:'modelo', etiqueta:'Modelo'};

export function campoDeAtributo(atributo:AtributoDeCatalogo):CampoDelBien{
    return {dimension:claveDeAtributo(atributo.atributo), etiqueta:atributo.nombre || atributo.atributo};
}

export function camposDelReporte(atributos:AtributoDeCatalogo[]):CampoDelBien[]{
    return [MARCA, MODELO, ...atributos.map(campoDeAtributo)];
}

export function dimensionesDelCampo(campo:CampoDelBien):string[]{
    return ['subcategoria', campo.dimension, 'estado', 'en_uso'];
}

export function dimensionesDeTiposDelCampo(campo:CampoDelBien):string[]{
    return ['subcategoria', campo.dimension, 'tipo_asignacion'];
}

export const SIN_CATEGORIA = 'Sin categoría';
export const SIN_SUBCATEGORIA = '(sin subcategoría)';
export const SIN_DATO = '(sin dato)';

export type Nivel = 'categoria' | 'subcategoria' | 'campo' | 'valor';

const NIVELES:Nivel[] = ['categoria', 'subcategoria', 'campo', 'valor'];

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

export type RespuestaDeCampo = {campo:CampoDelBien, filas:BienesAgrupadoFila[], deTipos:BienesAgrupadoFila[]};

type Armado = NodoDeModelos & {porValor:Map<string|null, Armado>, conDato:boolean};

const idDe = (camino:Partial<Record<Nivel, Paso>>) => JSON.stringify(NIVELES.filter(nivel => camino[nivel]).map(nivel => camino[nivel]!.valor));

function hijoDe(padre:{porValor:Map<string|null, Armado>, camino?:Partial<Record<Nivel, Paso>>}, nivel:Nivel, valor:string|null, nombre:() => string):Armado{
    let hijo = padre.porValor.get(valor);
    if(!hijo){
        const camino = {...padre.camino, [nivel]:{valor, nombre:nombre()}};
        hijo = {
            id:idDe(camino), nivel, profundidad:NIVELES.indexOf(nivel), valor, nombre:camino[nivel]!.nombre, camino,
            cuenta:cuentaVacia(), proporcion:0, hijos:[], porValor:new Map(), conDato:false,
        };
        padre.porValor.set(valor, hijo);
    }
    return hijo;
}

export function armarArbolDeModelos(
    respuestas:RespuestaDeCampo[],
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
    const deClasificacion = (subcategoria:string|null) => {
        const sub = subcategoria == null ? undefined : deSubcategoria.get(subcategoria);
        const categoria = sub?.categoria ?? null;
        const nodoCategoria = hijoDe(raiz, 'categoria', categoria, () =>
            categoria == null ? SIN_CATEGORIA : deCategoria.get(categoria)?.nombre || categoria);
        const nodoSubcategoria = hijoDe(nodoCategoria, 'subcategoria', subcategoria, () =>
            subcategoria == null ? SIN_SUBCATEGORIA : sub?.nombre || subcategoria);
        return [nodoCategoria, nodoSubcategoria];
    };
    respuestas.forEach(({campo, filas, deTipos}, indice) => {
        const ubicar = (subcategoria:string|null, valor:string|null, texto:string|null) => {
            const clasificacion = deClasificacion(subcategoria);
            const nodoCampo = hijoDe(clasificacion[1], 'campo', campo.dimension, () => campo.etiqueta);
            const nodoValor = hijoDe(nodoCampo, 'valor', valor, () => valor == null ? SIN_DATO : textoSinCodigo(texto ?? valor, valor) || valor);
            return {deLaClasificacion:indice === 0 ? clasificacion : [], delCampo:[nodoCampo, nodoValor]};
        };
        for(const {valores:[subcategoria = null, valor = null, estado = null, enUso = null], textos, cantidad} of filas){
            const clave = criterio.claveDe(estado);
            hayOtros ||= clave === OTROS;
            const deEnUso = enUso === EN_USO.valor ? cantidad : 0;
            const {deLaClasificacion, delCampo} = ubicar(subcategoria, valor, textos[1] ?? null);
            for(const nodo of [...deLaClasificacion, ...delCampo]){
                sumar(nodo.cuenta, clave, cantidad, deEnUso);
            }
            if(valor != null && cantidad > 0){ delCampo[0].conDato = true; }
        }
        for(const {valores:[subcategoria = null, valor = null, tipo = null], textos, cantidad} of deTipos){
            if(tipo == null){ continue; }
            const {deLaClasificacion, delCampo} = ubicar(subcategoria, valor, textos[1] ?? null);
            for(const nodo of [...deLaClasificacion, ...delCampo]){
                sumarTipo(nodo.cuenta, tipo, cantidad);
            }
        }
    });
    const total = sumarCuentas([...raiz.porValor.values()].map(nodo => nodo.cuenta));
    const terminar = ({porValor, conDato:_conDato, ...nodo}:Armado):NodoDeModelos => ({
        ...nodo,
        proporcion:total.total ? nodo.cuenta.total / total.total : 0,
        hijos:(nodo.nivel === 'subcategoria' ? [...porValor.values()].filter(campo => campo.conDato) : ordenar([...porValor.values()])).map(terminar),
    });
    return {raices:ordenar([...raiz.porValor.values()]).map(terminar), total, columnas:criterio.columnas(hayOtros), tipos:columnasDeTipos(tipos)};
}

function ordenar(nodos:Armado[]):Armado[]{
    return nodos.filter(nodo => nodo.cuenta.total > 0).sort((a, b) =>
        a.valor == null ? 1 : b.valor == null ? -1 : b.cuenta.total - a.cuenta.total || a.nombre.localeCompare(b.nombre));
}

export function aplanarModelos(nodos:NodoDeModelos[]):NodoDeModelos[]{
    return nodos.reduce<NodoDeModelos[]>((lista, nodo) => [...lista, nodo, ...aplanarModelos(nodo.hijos)], []);
}

const sinAcentos = (valor:string) => valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrarArbol(raices:NodoDeModelos[], buscado:string):{raices:NodoDeModelos[], abiertos:Set<string>}{
    const palabras = sinAcentos(buscado).split(/\s+/).filter(Boolean);
    const abiertos = new Set<string>();
    if(!palabras.length){
        return {raices, abiertos};
    }
    const filtrar = (nodo:NodoDeModelos):NodoDeModelos|null => {
        if(nodo.nivel === 'valor'){
            const donde = sinAcentos(`${nodo.camino.campo?.nombre ?? ''} ${nodo.nombre}`);
            return palabras.every(palabra => donde.includes(palabra)) ? nodo : null;
        }
        const hijos = nodo.hijos.map(filtrar).filter((hijo):hijo is NodoDeModelos => hijo != null);
        if(!hijos.length){
            return null;
        }
        abiertos.add(nodo.id);
        return {...nodo, hijos};
    };
    return {raices:raices.map(filtrar).filter((nodo):nodo is NodoDeModelos => nodo != null), abiertos};
}

export type CeldaDeModelos = {
    previos:FiltroPrevio[],
    nodo?:NodoDeModelos,
    estado?:ColumnaDeEstado,
    enUso?:boolean,
    tipo?:ColumnaDeTipo,
};

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
    const conSubcategoria = nodo != null && nodo.nivel !== 'categoria';
    for(const previo of previos){
        if(!(conSubcategoria && previo.dimension === 'categoria')){
            agregar(previo.dimension, previo.valor, previo.texto, previo.etiqueta);
        }
    }
    if(nodo){
        const {categoria, subcategoria, campo, valor} = nodo.camino;
        if(nodo.nivel === 'categoria'){ agregar('categoria', categoria!.valor, categoria!.nombre, 'categoría'); }
        if(subcategoria){ agregar('subcategoria', subcategoria.valor, subcategoria.nombre, 'subcategoría'); }
        if(campo && valor){ agregar(campo.valor!, valor.valor, valor.nombre, campo.nombre); }
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
        'Categoría', 'Subcategoría', 'Campo', 'Valor', 'Total', ...arbol.columnas.map(columna => columna.etiqueta), EN_USO.titulo,
        ...arbol.tipos.map(tipo => tipo.etiqueta),
    ]];
    for(const hoja of aplanarModelos(arbol.raices).filter(nodo => nodo.nivel === 'valor')){
        lineas.push([...NIVELES.map(nivel => hoja.camino[nivel]!.nombre), ...numeros(hoja.cuenta)]);
    }
    lineas.push(['Total general', '', '', '', ...numeros(arbol.total)]);
    return '﻿' + lineas.map(linea => linea.map(campoCsv).join(';')).join('\r\n') + '\r\n';
}

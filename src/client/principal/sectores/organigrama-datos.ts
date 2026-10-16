import type {BienesAgrupadoFila} from '../../../common/bienes-agrupar';
import {
    EN_USO, columnasDeTipos, criterioDeEstados, cuentaVacia, sumar, sumarCuentas, sumarTipo,
    type ColumnaDeEstado, type ColumnaDeTipo, type Cuenta, type EstadoDeCatalogo, type FiltroPrevio, type TipoDeCatalogo,
} from '../categorias/categorias-datos';

export const DIMENSIONES_DEL_ORGANIGRAMA = ['sector', 'estado', 'en_uso', 'tipo_asignacion'] as const;

export type NodoDelOrganigrama = {
    sector:string,
    sigla:string,
    nombre:string,
    activo:boolean,
    nivel:number,
    hijos:NodoDelOrganigrama[],
    propios:Cuenta,
    rama:Cuenta,
    personasPropias:number,
    personasRama:number,
    proporcion:number,
};

export type Organigrama = {
    raices:NodoDelOrganigrama[],
    sinSector:Cuenta,
    total:Cuenta,
    columnas:ColumnaDeEstado[],
    tipos:ColumnaDeTipo[],
};

const texto = (valor:unknown) => valor == null ? '' : String(valor).trim();

function padresValidos(padreDe:Map<string, string>):Map<string, string|null>{
    const validos = new Map<string, string|null>();
    for(const sector of padreDe.keys()){
        const padre = padreDe.get(sector)!;
        let valido = padre !== '' && padreDe.has(padre);
        const vistos = new Set<string>();
        for(let actual = padre; valido && padreDe.has(actual) && !vistos.has(actual); actual = padreDe.get(actual)!){
            if(actual === sector){
                valido = false;
            }
            vistos.add(actual);
        }
        validos.set(sector, valido ? padre : null);
    }
    return validos;
}

export function armarOrganigrama(
    sectores:Record<string, unknown>[],
    filas:BienesAgrupadoFila[],
    personas:Record<string, unknown>[],
    estados:EstadoDeCatalogo[],
    tipos:TipoDeCatalogo[] = [],
):Organigrama{
    const criterio = criterioDeEstados(estados);
    const datos = new Map<string, {sigla:string, nombre:string, activo:boolean}>();
    const padreDe = new Map<string, string>();
    for(const fila of sectores){
        const sector = texto(fila.sector);
        if(!sector){ continue; }
        datos.set(sector, {sigla:texto(fila.sigla), nombre:texto(fila.nombre_sector), activo:fila.activo !== false});
        padreDe.set(sector, texto(fila.pertenece_a));
    }
    const propios = new Map<string, Cuenta>();
    const sinSector = cuentaVacia();
    let hayOtros = false;
    for(const {valores:[sector = null, estado = null, enUso = null, tipo = null], cantidad} of filas){
        const clave = criterio.claveDe(estado);
        hayOtros ||= clave !== estado;
        const deEnUso = enUso === EN_USO.valor ? cantidad : 0;
        if(sector == null){
            sumar(sinSector, clave, cantidad, deEnUso);
            if(tipo != null){ sumarTipo(sinSector, tipo, cantidad); }
            continue;
        }
        if(!datos.has(sector)){
            datos.set(sector, {sigla:sector, nombre:'', activo:true});
            padreDe.set(sector, '');
        }
        if(!propios.has(sector)){ propios.set(sector, cuentaVacia()); }
        sumar(propios.get(sector)!, clave, cantidad, deEnUso);
        if(tipo != null){ sumarTipo(propios.get(sector)!, tipo, cantidad); }
    }
    const personasPropias = new Map(personas.map(fila => [texto(fila.sector), Number(fila.personas ?? 0) || 0]));
    const padres = padresValidos(padreDe);
    const hijosDe = new Map<string|null, string[]>();
    for(const [sector, padre] of padres){
        if(!hijosDe.has(padre)){ hijosDe.set(padre, []); }
        hijosDe.get(padre)!.push(sector);
    }
    const armar = (sector:string, nivel:number):NodoDelOrganigrama|null => {
        const {sigla, nombre, activo} = datos.get(sector)!;
        const hijos = (hijosDe.get(sector) ?? [])
            .map(hijo => armar(hijo, nivel + 1))
            .filter((nodo):nodo is NodoDelOrganigrama => nodo != null)
            .sort((a, b) => (a.sigla || a.sector).localeCompare(b.sigla || b.sector));
        const deEste = propios.get(sector) ?? cuentaVacia();
        const rama = sumarCuentas([deEste, ...hijos.map(hijo => hijo.rama)]);
        if(!activo && rama.total === 0 && hijos.length === 0){
            return null;
        }
        const personas = personasPropias.get(sector) ?? 0;
        return {
            sector, sigla, nombre, activo, nivel, hijos,
            propios:deEste,
            rama,
            personasPropias:personas,
            personasRama:personas + hijos.reduce((suma, hijo) => suma + hijo.personasRama, 0),
            proporcion:0,
        };
    };
    const raices = (hijosDe.get(null) ?? [])
        .map(sector => armar(sector, 0))
        .filter((nodo):nodo is NodoDelOrganigrama => nodo != null)
        .sort((a, b) => b.rama.total - a.rama.total || (a.sigla || a.sector).localeCompare(b.sigla || b.sector));
    const total = sumarCuentas([...raices.map(raiz => raiz.rama), sinSector]);
    const conProporcion = (nodo:NodoDelOrganigrama) => {
        nodo.proporcion = total.total ? nodo.rama.total / total.total : 0;
        nodo.hijos.forEach(conProporcion);
    };
    raices.forEach(conProporcion);
    return {raices, sinSector, total, columnas:criterio.columnas(hayOtros), tipos:columnasDeTipos(tipos)};
}

export function aplanar(organigrama:Organigrama):NodoDelOrganigrama[]{
    const lista:NodoDelOrganigrama[] = [];
    const recorrer = (nodo:NodoDelOrganigrama) => {
        lista.push(nodo);
        nodo.hijos.forEach(recorrer);
    };
    organigrama.raices.forEach(recorrer);
    return lista;
}

export function ancestros(organigrama:Organigrama, sector:string):string[]{
    const buscar = (nodo:NodoDelOrganigrama, camino:string[]):string[]|null => {
        if(nodo.sector === sector){ return camino; }
        for(const hijo of nodo.hijos){
            const encontrado = buscar(hijo, [...camino, nodo.sector]);
            if(encontrado){ return encontrado; }
        }
        return null;
    };
    for(const raiz of organigrama.raices){
        const encontrado = buscar(raiz, []);
        if(encontrado){ return encontrado; }
    }
    return [];
}

export function abiertosAlEntrar(organigrama:Organigrama):Set<string>{
    return new Set(aplanar(organigrama).filter(nodo => nodo.nivel <= 1 && nodo.hijos.length).map(nodo => nodo.sector));
}

const sinAcentos = (valor:string) => valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function coincide(nodo:NodoDelOrganigrama, buscado:string):boolean{
    const palabras = sinAcentos(buscado).split(/\s+/).filter(Boolean);
    const donde = sinAcentos(`${nodo.sigla} ${nodo.nombre} ${nodo.sector}`);
    return palabras.every(palabra => donde.includes(palabra));
}

export function etiquetaDeArea(nodo:NodoDelOrganigrama):string{
    return [nodo.sigla, nodo.nombre].filter(Boolean).join(' — ') || nodo.sector;
}

export function previosDeArea(nodo:NodoDelOrganigrama, conSubsectores:boolean):FiltroPrevio[]{
    return [conSubsectores
        ? {dimension:'sector_rama', etiqueta:'sector y subsectores', valor:nodo.sector, texto:nodo.sigla || nodo.sector}
        : {dimension:'sector', etiqueta:'sector', valor:nodo.sector, texto:nodo.sigla || nodo.sector}];
}

export const PREVIOS_SIN_SECTOR:FiltroPrevio[] = [{dimension:'sector', etiqueta:'sector', valor:null, texto:'Sin sector'}];

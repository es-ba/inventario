type Fila = Record<string, unknown>;

export const TODAS = '__todas__';
export const EN_CURSO = '__en_curso__';

export type FiltrosDeSolicitudes = {
    estado:string,
    soloMias:boolean,
    usuario:string,
    busqueda:string,
};

export type FiltroDeSolicitud = 'estado'|'mias'|'busqueda';

const CAMPOS_DE_BUSQUEDA = [
    'acta', 'responsable', 'responsables__apellido', 'responsables__nombre', 'sector', 'sectores__sigla', 'fichas',
];

function texto(valor:unknown):string{
    return String(valor ?? '').trim();
}

export function accionesDe(fila:Fila):unknown[]{
    let acciones = fila.acciones;
    if(typeof acciones === 'string'){
        try{
            acciones = JSON.parse(acciones);
        }catch{
            return [];
        }
    }
    return Array.isArray(acciones) ? acciones : [];
}

export function estaEnCurso(fila:Fila):boolean{
    return accionesDe(fila).length > 0;
}

export function pasaSolicitud(fila:Fila, filtros:FiltrosDeSolicitudes, sin:FiltroDeSolicitud[] = []):boolean{
    const estado = sin.includes('estado') || filtros.estado === TODAS
        || (filtros.estado === EN_CURSO ? estaEnCurso(fila) : texto(fila.estado) === filtros.estado);
    const mias = sin.includes('mias') || !filtros.soloMias || texto(fila.usuario_creacion) === texto(filtros.usuario);
    const buscado = filtros.busqueda.trim().toLowerCase();
    const busqueda = sin.includes('busqueda') || buscado === ''
        || CAMPOS_DE_BUSQUEDA.some(campo => texto(fila[campo]).toLowerCase().includes(buscado));
    return estado && mias && busqueda;
}

export type ConteoDeSolicitudes = {todas:number, enCurso:number, porEstado:Map<string, number>};

export function contarPorEstado(filas:Fila[], filtros:FiltrosDeSolicitudes):ConteoDeSolicitudes{
    const conteo:ConteoDeSolicitudes = {todas:0, enCurso:0, porEstado:new Map()};
    for(const fila of filas){
        if(!pasaSolicitud(fila, filtros, ['estado'])){
            continue;
        }
        conteo.todas++;
        if(estaEnCurso(fila)){
            conteo.enCurso++;
        }
        const estado = texto(fila.estado);
        conteo.porEstado.set(estado, (conteo.porEstado.get(estado) ?? 0) + 1);
    }
    return conteo;
}

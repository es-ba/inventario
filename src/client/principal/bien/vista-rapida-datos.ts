import {formatearValor} from '../base/formato-valores';

export const SIN_DATO = '—';

export type DatoDeVistaRapida = {etiqueta:string, valor:string};
export type SeccionDeVistaRapida = {titulo:string, datos:DatoDeVistaRapida[]};

type Fila = Record<string, unknown>;

const valor = (dato:unknown):string => {
    const texto = formatearValor(dato).trim();
    return texto === '' ? SIN_DATO : texto;
};

const conDescripcion = (codigo:unknown, descripcion:string|null|undefined):string => {
    const base = valor(codigo);
    const extra = (descripcion ?? '').trim();
    return base === SIN_DATO || extra === '' || extra === base ? base : `${base} — ${extra}`;
};

export function seccionesDeVistaRapida(row:Fila, descripcionDeEstado:(estado:string) => string|null|undefined):SeccionDeVistaRapida[]{
    const dato = (etiqueta:string, contenido:unknown):DatoDeVistaRapida => ({etiqueta, valor:valor(contenido)});
    return [
        {titulo:'Datos principales', datos:[
            dato('ficha', row.ficha),
            dato('descripción', row.detalle),
            {etiqueta:'estado', valor:conDescripcion(row.estado, descripcionDeEstado(String(row.estado ?? '')))},
            dato('rubro', row.rubro),
            dato('clase', row.clase),
            dato('grupo', row.grupo),
            dato('marca', row.marca),
            dato('modelo', row.modelo),
            dato('serie', row.serie),
            dato('número integrado', row.numero_integrado),
            dato('último control', row.fecha_ultimo_control),
            dato('situación de control', row.situacion_control),
            dato('última modificación', row.fecha_ultima_modificacion),
            dato('modificado por', row.usuario_ultima_modificacion),
        ]},
        {titulo:'Asignación', datos:[
            dato('sector', row.sector),
            dato('responsable del sector', row.responsable_sector_nombre),
            dato('responsable directo', row.responsable),
            dato('sede', row.sede),
            dato('espacio', row.espacio),
            dato('puesto', row.puesto),
            dato('en uso de', row.enusode),
            dato('responsable en uso de', row.enusode_responsable_nombre),
            dato('último movimiento', row.fecha_ultimo_movimiento),
            dato('movido por', row.usuario_ultimo_movimiento),
        ]},
    ];
}

export function vecinos<T extends Fila>(rows:readonly T[], ficha:string|null):{anterior:T|null, siguiente:T|null}{
    const i = ficha == null ? -1 : rows.findIndex(row => String(row.ficha) === ficha);
    if(i < 0){
        return {anterior:null, siguiente:null};
    }
    return {anterior:rows[i - 1] ?? null, siguiente:rows[i + 1] ?? null};
}

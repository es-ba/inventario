import {formatearValor} from '../base/formato-valores';
import type {BienesBusquedaRequest} from '../../../common/contracts';

export type DatoDeEscaneo = {etiqueta:string, valor:string, ancho?:boolean};
export type SeccionDeEscaneo = {titulo:string, datos:DatoDeEscaneo[]};

type Fila = Record<string, unknown>;

export function consultaPorFicha(ficha:string):BienesBusquedaRequest{
    return {
        estado:'todos',
        logicOperator:'and',
        filters:[],
        quickSearch:'',
        gridFilters:[{source:'field', target:'ficha', operator:'equals', value:ficha}],
        page:0,
        pageSize:10,
        sortModel:[],
    };
}

export function seccionesDeEscaneo(row:Fila):SeccionDeEscaneo[]{
    const dato = (etiqueta:string, contenido:unknown, ancho?:boolean):DatoDeEscaneo =>
        ({etiqueta, valor:formatearValor(contenido).trim(), ...(ancho ? {ancho} : {})});
    const atributos = Array.isArray(row.atributos) ? row.atributos as Fila[] : [];
    return [
        {titulo:'Identificación', datos:[
            dato('grupo', row.grupo, true),
            dato('marca', row.marca),
            dato('modelo', row.modelo),
            dato('serie', row.serie),
            dato('IMEI', row.imei),
            dato('línea', row.linea),
            dato('año', row.annio),
            dato('número integrado', row.numero_integrado),
            dato('tipo de bien', row.tipo_bien),
        ]},
        {titulo:'Asignación', datos:[
            dato('sector', row.sector),
            dato('nombre del sector', row.nombre_sector, true),
            dato('responsable del sector', row.responsable_sector_nombre, true),
            dato('responsable directo', row.responsable, true),
            dato('en uso de', row.enusode),
            dato('responsable de uso', row.enusode_responsable_nombre, true),
            dato('tipo de asignación', row.tipo_asignacion),
            dato('modalidad de uso', row.modalidad_uso),
            dato('sede', row.sede, true),
            dato('espacio', row.espacio, true),
            dato('puesto', row.puesto),
            dato('ubicación', row.ubicacion, true),
            dato('último movimiento', row.fecha_ultimo_movimiento),
            dato('movido por', row.usuario_ultimo_movimiento),
        ]},
        {titulo:'Atributos', datos:atributos.map(atributo =>
            dato(String(atributo.nombre ?? atributo.atributo ?? ''), atributo.valor))},
        {titulo:'Control', datos:[
            dato('último control', row.fecha_ultimo_control),
            dato('situación', row.situacion_control),
        ]},
        {titulo:'Clasificación', datos:[
            dato('rubro', row.rubro, true),
            dato('clase', row.clase, true),
            dato('cuenta', row.cuenta, true),
            dato('clasificación', row.clasificacion),
            dato('orden de compra', row.orden_compra),
        ]},
        {titulo:'Observaciones', datos:[
            dato('observación', row.observacion, true),
            dato('aclaración', row.aclaracion, true),
        ]},
        {titulo:'Baja', datos:[
            dato('estado de la baja', row.estado_baja),
            dato('motivo de baja', row.motivo_baja),
            dato('fecha de solicitud', row.fecha_solicitud),
        ]},
    ].map(seccion => ({...seccion, datos:seccion.datos.filter(d => d.valor !== '')}))
        .filter(seccion => seccion.datos.length > 0);
}

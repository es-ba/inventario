"use strict";

import { codigoTextoSql, sqlBienes, textoDeSectorGuardadoSql } from "./table-bienes";
import { sqlUltimoControl } from "./controles-bien";
import { DIAS_MAXIMOS_DEL_RANGO, TIPOS_DE_EVENTO, TipoDeEvento, diasEntre, esYmd } from "../common/calendario";

export const BIENES_POR_PAGINA_MAXIMO = 100;

export class ErrorCalendario extends Error{}

export function validarRango(desde:unknown, hasta:unknown):{desde:string, hasta:string}{
    if(!esYmd(desde) || !esYmd(hasta)){
        throw new ErrorCalendario('Las fechas del calendario no son válidas');
    }
    if(hasta < desde){
        throw new ErrorCalendario('El rango del calendario está invertido');
    }
    if(diasEntre(desde, hasta) > DIAS_MAXIMOS_DEL_RANGO){
        throw new ErrorCalendario(`El rango del calendario no puede superar ${DIAS_MAXIMOS_DEL_RANGO} días`);
    }
    return {desde, hasta};
}

export function validarPagina(desde:unknown, cantidad:unknown):{desde:number, cantidad:number}{
    const inicio = Number(desde ?? 0);
    const tamanio = Number(cantidad ?? 25);
    if(!Number.isInteger(inicio) || inicio < 0){
        throw new ErrorCalendario('El inicio de la página no es válido');
    }
    if(!Number.isInteger(tamanio) || tamanio < 1 || tamanio > BIENES_POR_PAGINA_MAXIMO){
        throw new ErrorCalendario(`La página tiene que tener entre 1 y ${BIENES_POR_PAGINA_MAXIMO} bienes`);
    }
    return {desde:inicio, cantidad:tamanio};
}

export function tiposConocidos(tipos:unknown[]):TipoDeEvento[]{
    return TIPOS_DE_EVENTO.filter(tipo => tipos.includes(tipo));
}

export const NOMBRE_DE_PERSONA = (alias:string) =>
    `concat_ws(', ', nullif(btrim(${alias}.apellido), ''), nullif(btrim(${alias}.nombre), ''))`;

const GRUPO_DE_MOVIMIENTO = `coalesce('acta:' || mb.acta_origen::text, 'accion:' || coalesce(mb.accion, ''))`;

const TITULO_DE_BAJA = `coalesce(nullif(eb.descripcion, ''), nullif(eb.identificador, ''), h.valor_nuevo, r.accion_baja)`;

const JOINS_DE_BAJA = `
  LEFT JOIN estados_baja eb ON eb.estado_baja = h.valor_nuevo
  LEFT JOIN LATERAL (
      SELECT eba.accion_baja
        FROM estados_baja_acciones eba
       WHERE eba.estado_destino IS NULL AND eba.activo_destino
       ORDER BY eba.transicion_baja
       LIMIT 1
  ) r ON h.valor_nuevo IS NULL`;

export function sqlMovimientos():string{
    return `
SELECT mb.fecha_movimiento::date AS fecha, 'MOVIMIENTO'::text AS tipo,
       ${GRUPO_DE_MOVIMIENTO} AS grupo,
       concat_ws(' · ', coalesce(nullif(am.descripcion, ''), mb.accion), 'N.º ' || mb.acta_origen::text) AS titulo,
       CASE WHEN mb.acta_origen IS NOT NULL THEN 'w=solicitudes&acta=' || mb.acta_origen::text END AS enlace,
       mb.usuario_creacion AS usuario, mb.momento,
       b.ficha
  FROM movimientos_bien mb
  JOIN bienes b ON b.ficha = mb.ficha
  LEFT JOIN acciones_movimiento am ON am.accion_movimiento = mb.accion
 WHERE mb.fecha_movimiento BETWEEN $1::date AND $2::date`;
}

export function sqlBajas():string{
    return `
SELECT h.fecha::date AS fecha, 'BAJA'::text AS tipo,
       'estado:' || coalesce(h.valor_nuevo, '') AS grupo,
       ${TITULO_DE_BAJA} AS titulo,
       NULL::text AS enlace,
       h.usuario, NULL::timestamp AS momento,
       b.ficha
  FROM historial_bienes h
  JOIN bienes b ON b.ficha = h.ficha
  ${JOINS_DE_BAJA}
 WHERE h.campo = 'estado_baja'
   AND h.fecha::date BETWEEN $1::date AND $2::date`;
}

export function sqlControles(dias:number):string{
    const vigencia = Math.trunc(dias);
    return `
SELECT (uc.fecha + ${vigencia})::date AS fecha, 'CONTROL'::text AS tipo,
       ''::text AS grupo, ''::text AS titulo, NULL::text AS enlace, NULL::text AS usuario, NULL::timestamp AS momento,
       b.ficha
  FROM bienes b
  ${sqlUltimoControl('b')}
 WHERE b.activo
   AND uc.fecha IS NOT NULL
   AND (uc.fecha + ${vigencia}) BETWEEN $1::date AND $2::date`;
}

export function sqlEgresos():string{
    return `
SELECT DISTINCT r.fecha_egreso::date AS fecha, 'EGRESO'::text AS tipo,
       'persona:' || r.responsable AS grupo,
       concat_ws(' · ', nullif(${NOMBRE_DE_PERSONA('r')}, ''), nullif(btrim(sr.sigla), '')) AS titulo,
       NULL::text AS enlace, NULL::text AS usuario, NULL::timestamp AS momento,
       v.ficha
  FROM responsables r
  LEFT JOIN sectores sr ON sr.sector = r.sector
  JOIN (${sqlBienes}) v ON v.responsable = r.responsable OR v.responsable_sector = r.responsable
 WHERE v.activo
   AND r.fecha_egreso BETWEEN $1::date AND $2::date`;
}

export function sqlEventos(tipos:TipoDeEvento[], dias:number):string{
    const fuentes:Record<TipoDeEvento, () => string> = {
        MOVIMIENTO:sqlMovimientos,
        BAJA:sqlBajas,
        CONTROL:() => sqlControles(dias),
        EGRESO:sqlEgresos,
    };
    return tiposConocidos(tipos).map(tipo => `(${fuentes[tipo]()})`).join('\nUNION ALL\n');
}

export function sqlResumen(tipos:TipoDeEvento[], dias:number):string{
    return `
SELECT e.fecha::text AS fecha, e.tipo, e.grupo, coalesce(e.titulo, '') AS titulo, count(DISTINCT e.ficha)::integer AS cantidad
  FROM (${sqlEventos(tipos, dias)}) e
 GROUP BY e.fecha, e.tipo, e.grupo, e.titulo
 ORDER BY e.fecha, e.tipo, e.grupo`;
}

export function sqlDetalle(tipos:TipoDeEvento[], dias:number):string{
    return `
SELECT e.tipo, e.grupo, coalesce(e.titulo, '') AS titulo, max(e.enlace) AS enlace,
       count(DISTINCT e.ficha)::integer AS cantidad,
       coalesce(string_agg(DISTINCT e.usuario, ', '), '') AS usuarios,
       to_char(min(e.momento), 'HH24:MI') AS hora
  FROM (${sqlEventos(tipos, dias)}) e
 GROUP BY e.tipo, e.grupo, e.titulo
 ORDER BY e.tipo, cantidad DESC, e.grupo`;
}

function columnasDelBien(alias:string):string{
    return `${alias}.ficha, ${alias}.detalle,
       coalesce(nullif(btrim(g.descripcion), ''), ${alias}.grupo) AS bien_grupo,
       coalesce(nullif(btrim(ma.descripcion), ''), ${alias}.marca) AS marca,
       ${alias}.modelo, ${alias}.serie`;
}

function joinsDelBien(alias:string):string{
    return `LEFT JOIN grupos g ON g.grupo = ${alias}.grupo
  LEFT JOIN marcas ma ON ma.marca = ${alias}.marca`;
}

function lateralUbicacion(alias:string, filtro:string):string{
    return `LEFT JOIN LATERAL (
      SELECT ${textoDeSectorGuardadoSql('m.sector', 'm.sector_sigla', 'm.sector_nombre')} AS sector,
             ${codigoTextoSql('m.responsable', NOMBRE_DE_PERSONA('rp'))} AS responsable,
             ${codigoTextoSql('m.espacio', "concat_ws(' — ', nullif(btrim(e.numero), ''), nullif(btrim(e.denominacion), ''))")} AS espacio
        FROM movimientos_bien m
        LEFT JOIN responsables rp ON rp.responsable = m.responsable
        LEFT JOIN espacios e ON e.espacio = m.espacio
       WHERE ${filtro}
       ORDER BY m.orden DESC
       LIMIT 1
  ) ${alias} ON true`;
}

function paginado(sql:string, orden:string):string{
    return `${sql}
 ORDER BY ${orden}
 LIMIT $3 OFFSET $4`;
}

export function sqlBienesDelGrupo(tipo:TipoDeEvento, dias:number):string{
    switch(tipo){
        case 'MOVIMIENTO':
            return `
SELECT ${columnasDelBien('b')}, mb.total,
       to_char(mb.momento, 'HH24:MI') AS hora, mb.usuario_creacion AS usuario,
       antes.sector AS de_sector, antes.responsable AS de_responsable, antes.espacio AS de_espacio,
       despues.sector AS a_sector, despues.responsable AS a_responsable, despues.espacio AS a_espacio
  FROM (${paginado(`
SELECT mb.ficha, mb.orden, mb.momento, mb.usuario_creacion, count(*) OVER () AS total
  FROM movimientos_bien mb
  JOIN bienes b ON b.ficha = mb.ficha
 WHERE mb.fecha_movimiento = $1::date
   AND ${GRUPO_DE_MOVIMIENTO} = $2`, 'mb.momento NULLS LAST, mb.ficha, mb.orden')}) mb
  JOIN bienes b ON b.ficha = mb.ficha
  ${joinsDelBien('b')}
  ${lateralUbicacion('antes', 'm.ficha = mb.ficha AND m.orden < mb.orden')}
  ${lateralUbicacion('despues', 'm.ficha = mb.ficha AND m.orden = mb.orden')}
 ORDER BY mb.momento NULLS LAST, b.ficha, mb.orden`;
        case 'BAJA':
            return paginado(`
SELECT ${columnasDelBien('b')}, count(*) OVER () AS total,
       to_char(h.fecha, 'HH24:MI') AS hora, h.usuario,
       ${TITULO_DE_BAJA} AS paso,
       coalesce(ev.motivo_restauracion, ev.motivo_rechazo, nullif(btrim(mot.descripcion), ''), ev.motivo_baja) AS motivo,
       ev.respaldo
  FROM historial_bienes h
  JOIN bienes b ON b.ficha = h.ficha
  ${joinsDelBien('b')}
  ${JOINS_DE_BAJA}
  LEFT JOIN LATERAL (
      SELECT (SELECT x.valor_nuevo FROM historial_bienes x
               WHERE x.ficha = h.ficha AND x.orden <= h.orden AND x.campo = 'motivo_baja'
               ORDER BY x.orden DESC LIMIT 1) AS motivo_baja,
             (SELECT x.valor_nuevo FROM historial_bienes x
               WHERE x.ficha = h.ficha AND x.orden = h.orden AND x.campo = 'motivo_rechazo') AS motivo_rechazo,
             (SELECT x.valor_nuevo FROM historial_bienes x
               WHERE x.ficha = h.ficha AND x.orden = h.orden AND x.campo = 'motivo_restauracion') AS motivo_restauracion,
             (SELECT x.valor_nuevo FROM historial_bienes x
               WHERE x.ficha = h.ficha AND x.orden <= h.orden AND x.campo = 'documento_respaldo'
               ORDER BY x.orden DESC LIMIT 1) AS respaldo
  ) ev ON true
  LEFT JOIN motivos_baja mot ON mot.motivo_baja = ev.motivo_baja
 WHERE h.campo = 'estado_baja'
   AND h.fecha::date = $1::date
   AND 'estado:' || coalesce(h.valor_nuevo, '') = $2`, 'h.fecha, b.ficha');
        case 'CONTROL':{
            const vigencia = Math.trunc(dias);
            return paginado(`
SELECT ${columnasDelBien('b')}, count(*) OVER () AS total,
       uc.fecha AS ultimo_control, c.momento AS cargado, c.usuario_creacion AS usuario,
       actual.sector, actual.responsable
  FROM bienes b
  ${joinsDelBien('b')}
  ${sqlUltimoControl('b')}
  LEFT JOIN controles_bien c ON c.control = uc.control
  ${lateralUbicacion('actual', 'm.ficha = b.ficha')}
 WHERE b.activo
   AND uc.fecha IS NOT NULL
   AND (uc.fecha + ${vigencia}) = $1::date
   AND $2 = ''`, 'b.ficha');
        }
        case 'EGRESO':
            return paginado(`
SELECT x.*, count(*) OVER () AS total FROM (
    SELECT DISTINCT ON (v.ficha) ${columnasDelBien('v')},
           CASE WHEN v.responsable = r.responsable THEN 'directo' ELSE 'sector' END AS a_cargo_como
      FROM responsables r
      JOIN (${sqlBienes}) v ON v.responsable = r.responsable OR v.responsable_sector = r.responsable
      ${joinsDelBien('v')}
     WHERE v.activo
       AND r.fecha_egreso = $1::date
       AND 'persona:' || r.responsable = $2
     ORDER BY v.ficha, (v.responsable = r.responsable) DESC
) x`, 'x.ficha');
    }
}

import {CODIGO_SIN_ASIGNAR} from '../../../common/reportes';
import type {FiltroPrevio} from '../categorias/categorias-datos';

export type ResponsableDelReporte = {
    responsable:string,
    nombre:string,
    aCargo:number,
    enUso:number,
    bienesDeSectoresACargo:number,
    personasACargo:number,
    sectores:number,
    sedes:number,
};

export type Vinculo = 'cargo'|'uso';

export const VINCULOS:{vinculo:Vinculo, titulo:string, dimension:string, etiqueta:string}[] = [
    {vinculo:'cargo', titulo:'A cargo', dimension:'responsable_sector', etiqueta:'responsable del sector'},
    {vinculo:'uso', titulo:'En uso', dimension:'enusode_responsable', etiqueta:'en uso de'},
];

export const SIN_RESPONSABLE = 'Sin responsable';

const texto = (valor:unknown) => valor == null ? '' : String(valor).trim();
const numero = (valor:unknown) => Number(valor ?? 0) || 0;

export function filasDeResponsables(filas:Record<string, unknown>[]):ResponsableDelReporte[]{
    return filas
        .map(fila => {
            const responsable = texto(fila.responsable);
            const nombre = responsable === CODIGO_SIN_ASIGNAR
                ? SIN_RESPONSABLE
                : [texto(fila.responsables__apellido), texto(fila.responsables__nombre)].filter(Boolean).join(', ') || responsable;
            return {
                responsable,
                nombre,
                aCargo:numero(fila.cantidad),
                enUso:numero(fila.cantidad_asignados),
                bienesDeSectoresACargo:numero(fila.cantidad_dependientes),
                personasACargo:numero(fila.personas_dependientes),
                sectores:numero(fila.sectores),
                sedes:numero(fila.sedes),
            };
        })
        .filter(fila => fila.aCargo || fila.enUso || fila.bienesDeSectoresACargo || fila.personasACargo)
        .sort((a, b) => b.aCargo - a.aCargo || b.enUso - a.enUso || a.nombre.localeCompare(b.nombre));
}

const sinAcentos = (valor:string) => valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function pasaBusqueda(fila:ResponsableDelReporte, buscado:string):boolean{
    const palabras = sinAcentos(buscado).split(/\s+/).filter(Boolean);
    const donde = sinAcentos(`${fila.nombre} ${fila.responsable}`);
    return palabras.every(palabra => donde.includes(palabra));
}

export function previosDeResponsable(fila:ResponsableDelReporte, vinculo:Vinculo):FiltroPrevio[]{
    const {dimension, etiqueta} = VINCULOS.find(v => v.vinculo === vinculo)!;
    return [{
        dimension,
        etiqueta,
        valor:fila.responsable === CODIGO_SIN_ASIGNAR ? null : fila.responsable,
        texto:fila.nombre,
    }];
}

export function cantidadDelVinculo(fila:ResponsableDelReporte, vinculo:Vinculo):number{
    return vinculo === 'cargo' ? fila.aCargo : fila.enUso;
}

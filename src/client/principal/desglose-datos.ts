import type {DimensionAgrupar, DimensionDisponible, GrupoFiltro} from '../../common/bienes-agrupar';
import type {BienesBusquedaRequest} from '../../common/contracts';

export const DESGLOSE_INICIAL:DimensionAgrupar = 'categoria';

export function dimensionDelDesglose(
    disponibles:DimensionDisponible[],
    guardada:DimensionAgrupar|null,
):DimensionAgrupar|null{
    const claves = disponibles.map(dimension => dimension.clave);
    return [guardada, DESGLOSE_INICIAL].find(clave => clave != null && claves.includes(clave))
        ?? claves[0]
        ?? null;
}

export function estaElegido(
    grupoFiltro:GrupoFiltro[]|null|undefined,
    dimension:DimensionAgrupar|null,
    valor:string|null,
):boolean{
    return esFiltroPropio(grupoFiltro, dimension)
        && (grupoFiltro![0].valor ?? null) === (valor ?? null);
}

export function esFiltroPropio(
    grupoFiltro:GrupoFiltro[]|null|undefined,
    dimension:DimensionAgrupar|null,
):boolean{
    return grupoFiltro?.length === 1 && grupoFiltro[0].dimension === dimension;
}

export function consultaDelDesglose(
    consulta:BienesBusquedaRequest,
    grupoFiltro:GrupoFiltro[]|null|undefined,
    dimension:DimensionAgrupar,
):BienesBusquedaRequest{
    return grupoFiltro?.length && !esFiltroPropio(grupoFiltro, dimension)
        ? {...consulta, grupoFiltro, agruparPor:[dimension]}
        : {...consulta, agruparPor:[dimension]};
}

function claveDeDesglose(usuario:string):string{
    return `inventario.busqueda-bienes.desglose.${usuario}`;
}

export function leerDesglose(usuario:string):DimensionAgrupar|null{
    try{
        return globalThis.localStorage?.getItem(claveDeDesglose(usuario)) ?? null;
    }catch{
        return null;
    }
}

export function guardarDesglose(usuario:string, dimension:DimensionAgrupar):void{
    try{
        globalThis.localStorage?.setItem(claveDeDesglose(usuario), dimension);
    }catch{
    }
}

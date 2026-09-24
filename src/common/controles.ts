import {fichaDesdeEAN13} from './codigos-barra';

export function buscarBienParaControl<T extends {ficha?:unknown, serie?:unknown}>(texto:string, filas:T[], visibles:T[] = filas):{bien?:T, error?:string}{
    const buscado = texto.trim();
    if(!buscado){ return {}; }
    const fichaEAN = fichaDesdeEAN13(buscado);
    const bien = filas.find(fila => String(fila.ficha).trim() === (fichaEAN ?? buscado));
    if(bien){ return {bien}; }
    if(fichaEAN){ return {error:`La ficha ${fichaEAN} no está entre los bienes a controlar.`}; }
    const coincidencias = visibles.filter(fila => String(fila.serie ?? '').toLowerCase().includes(buscado.toLowerCase()));
    if(coincidencias.length === 1){ return {bien:coincidencias[0]}; }
    return {error:coincidencias.length > 1
        ? 'Hay varias coincidencias de serie. Seleccioná un bien del listado.'
        : 'No se encontró una ficha o serie coincidente entre los bienes a controlar con estos filtros.'};
}

export const TIPOS_DE_ITEM = ['si_no', 'texto', 'opcion'] as const;

export type TipoDeItem = typeof TIPOS_DE_ITEM[number];

export const VALORES_SI_NO = ['SI', 'NO'] as const;

export const SITUACIONES_DE_CONTROL = ['NUNCA', 'VENCIDO', 'VIGENTE'] as const;

export type SituacionDeControl = typeof SITUACIONES_DE_CONTROL[number];

export type GruposPorItem = Map<string, Set<string>>;

export function armarGruposPorItem(filas:{item?:unknown, grupo?:unknown}[]):GruposPorItem{
    const grupos:GruposPorItem = new Map();
    for(const fila of filas){
        const item = String(fila.item ?? '').trim();
        const grupo = String(fila.grupo ?? '').trim();
        if(item === '' || grupo === ''){
            continue;
        }
        if(!grupos.has(item)){
            grupos.set(item, new Set());
        }
        grupos.get(item)!.add(grupo);
    }
    return grupos;
}

export function itemAplica(item:string, grupo:string|null|undefined, gruposPorItem:GruposPorItem):boolean{
    const grupos = gruposPorItem.get(item);
    if(grupos == null || grupos.size === 0){
        return true;
    }
    return grupo != null && grupos.has(String(grupo).trim());
}

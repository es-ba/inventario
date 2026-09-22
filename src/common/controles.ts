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

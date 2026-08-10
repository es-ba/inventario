import type {BienesBusquedaRow} from './contracts';

export type EtiquetaCodigoBarra = {
    ficha:string;
    valorEAN13:string;
    detalle:string;
};

export class FichasCodigoBarraInvalidasError extends Error {
    constructor(public readonly fichas:string[]){
        super(`No se pueden generar códigos de barra para: ${fichas.join(', ')}`);
        this.name = 'FichasCodigoBarraInvalidasError';
    }
}

export function normalizarFichaEAN13(ficha:unknown):string|null{
    const text = String(ficha ?? '').trim();
    if(!/^\d+$/.test(text)){
        return null;
    }
    return (`000000000000${text}`).slice(-12);
}

export function prepararEtiquetasCodigosBarra(
    rows:readonly BienesBusquedaRow[],
):EtiquetaCodigoBarra[]{
    const invalidas = rows
        .filter(row => normalizarFichaEAN13(row.ficha) == null)
        .map(row => String(row.ficha ?? '').trim() || '(vacía)');
    if(invalidas.length > 0){
        throw new FichasCodigoBarraInvalidasError(invalidas);
    }
    return rows.map(row => ({
        ficha:String(row.ficha).trim(),
        valorEAN13:normalizarFichaEAN13(row.ficha) as string,
        detalle:String(row.detalle ?? '').trim(),
    }));
}

export function sincronizarFilasSeleccionadas(
    previous:ReadonlyMap<string, BienesBusquedaRow>,
    selectedIds:readonly unknown[],
    currentRows:readonly BienesBusquedaRow[],
):Map<string, BienesBusquedaRow>{
    const currentById = new Map(
        currentRows.map(row => [String(row.ficha), row] as const),
    );
    const next = new Map<string, BienesBusquedaRow>();
    selectedIds.forEach(selectedId => {
        const id = String(selectedId);
        const row = currentById.get(id) ?? previous.get(id);
        if(row != null){
            next.set(id, row);
        }
    });
    return next;
}

export function filasSeleccionadasEnOrden(
    selectedIds:readonly unknown[],
    selectedRows:ReadonlyMap<string, BienesBusquedaRow>,
):BienesBusquedaRow[]{
    return selectedIds.map(selectedId => {
        const id = String(selectedId);
        const row = selectedRows.get(id);
        if(row == null){
            throw new Error(`No se encontraron los datos del bien ${id}. Actualizá y volvé a seleccionar.`);
        }
        return row;
    });
}

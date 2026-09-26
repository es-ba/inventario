type Fila = Record<string, unknown>;

export const CAMPOS_CLONABLES = [
    'tipo_bien', 'prd',
    'rubro', 'clase', 'cuenta', 'grupo', 'clasificacion',
    'marca', 'modelo', 'annio',
    'importe', 'importetotal', 'orden_compra',
    'entidad_prestadora', 'fecha_inicio', 'fecha_fin', 'renovable', 'condiciones', 'costo_mensual',
    'detalle', 'aclaracion',
] as const;

export function datosParaClonar(fila:Fila):Fila{
    const copia:Fila = {};
    for(const campo of CAMPOS_CLONABLES){
        const valor = fila[campo];
        if(valor != null && valor !== ''){
            copia[campo] = valor;
        }
    }
    return copia;
}

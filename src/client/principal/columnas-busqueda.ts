export const COLUMNAS_INICIALES:readonly string[] = Object.freeze([
    'ficha',
    'detalle',
    'grupo',
    'marca',
    'modelo',
    'serie',
    'estado',
    'sector_sigla',
    'responsable_sector_nombre',
    'espacio',
    'tipo_asignacion',
    'enusode_responsable_nombre',
]);

const SIEMPRE_VISIBLES = new Set(['__acciones']);

export function ordenDeColumnas<T extends {field:string}>(columnas:readonly T[]):T[]{
    const posicion = (field:string) => {
        const i = COLUMNAS_INICIALES.indexOf(field);
        return i < 0 ? COLUMNAS_INICIALES.length : i;
    };
    return columnas
        .map((columna, i) => ({columna, i}))
        .sort((a, b) => posicion(a.columna.field) - posicion(b.columna.field) || a.i - b.i)
        .map(({columna}) => columna);
}

export function modeloInicial(campos:readonly string[]):Record<string, boolean>{
    const iniciales = new Set(COLUMNAS_INICIALES);
    const modelo:Record<string, boolean> = {};
    campos.forEach(campo => { modelo[campo] = iniciales.has(campo) || SIEMPRE_VISIBLES.has(campo); });
    return modelo;
}

export function textoSinCodigo(valor:unknown, codigo:unknown):string{
    const texto = valor == null ? '' : String(valor);
    const clave = codigo == null ? '' : String(codigo).trim();
    const prefijo = `${clave} — `;
    return clave !== '' && texto.startsWith(prefijo) ? texto.slice(prefijo.length) : texto;
}

export function textoDeCoincidencia(campos:unknown, tituloDeCampo:(campo:string) => string):string{
    if(!Array.isArray(campos) || campos.length === 0){
        return '';
    }
    return `coincide en ${campos.map(campo => tituloDeCampo(String(campo))).join(', ')}`;
}

function claveDeColumnas(usuario:string):string{
    return `inventario.busqueda-bienes.columnas.${usuario}`;
}

export function leerColumnas(usuario:string):Record<string, boolean>|null{
    try{
        const guardado = globalThis.localStorage?.getItem(claveDeColumnas(usuario));
        const modelo = guardado ? JSON.parse(guardado) : null;
        return modelo && typeof modelo === 'object' && !Array.isArray(modelo) ? modelo : null;
    }catch{
        return null;
    }
}

export function guardarColumnas(usuario:string, modelo:Record<string, boolean>|null):void{
    try{
        if(modelo == null){
            globalThis.localStorage?.removeItem(claveDeColumnas(usuario));
        }else{
            globalThis.localStorage?.setItem(claveDeColumnas(usuario), JSON.stringify(modelo));
        }
    }catch{
    }
}

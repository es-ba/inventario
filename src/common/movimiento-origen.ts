export const CAMPOS_DEL_MOVIMIENTO = [
    'sector', 'responsable', 'sede', 'espacio', 'puesto', 'tipo_asignacion', 'modalidad_uso',
    'enusode_responsable',
] as const;

export type CampoDelMovimiento = typeof CAMPOS_DEL_MOVIMIENTO[number];

export const SIN_ASIGNAR = 'sin asignar';

export type ValorDeOrigen = {codigo:string|null, texto:string, detalle:string|null, cantidad:number};

export type OrigenDeCampo = {
    valores:ValorDeOrigen[],
    unico:boolean,
    codigoUnico:string|null,
};

const COLUMNA_DE_TEXTO:Record<CampoDelMovimiento, string[]> = {
    sector:['sector_texto', 'sector_sigla'],
    responsable:['responsable_texto', 'responsable_nombre'],
    sede:['sede_texto', 'sede_nombre'],
    espacio:['espacio_texto', 'espacio_numero'],
    puesto:[],
    tipo_asignacion:['tipo_asignacion_texto'],
    modalidad_uso:['modalidad_uso_texto'],
    enusode_responsable:['enusode_responsable_nombre'],
};

const COLUMNA_DE_DETALLE:Partial<Record<CampoDelMovimiento, string[]>> = {
    sector:['responsable_sector_nombre', 'responsable_sector'],
};

const SIN_CODIGO_APARTE:CampoDelMovimiento[] = ['puesto', 'enusode_responsable'];

function conCodigoAparte(bien:Record<string, unknown>, campo:CampoDelMovimiento):boolean{
    if(SIN_CODIGO_APARTE.indexOf(campo) >= 0){
        return false;
    }
    return Object.prototype.hasOwnProperty.call(bien, `${campo}_codigo`);
}

export type Destino = Partial<Record<CampoDelMovimiento, string>>;

export function copiarTodoElOrigen(
    destino:Destino,
    origenes:Record<CampoDelMovimiento, OrigenDeCampo>,
):Destino{
    const copia:Destino = {...destino};
    for(const campo of CAMPOS_DEL_MOVIMIENTO){
        const codigo = origenes[campo].codigoUnico;
        if(codigo != null){
            copia[campo] = codigo;
        }
    }
    return copia;
}

export function destinoAEnviar(destino:Destino):Record<string, string>{
    const aEnviar:Record<string, string> = {};
    for(const campo of CAMPOS_DEL_MOVIMIENTO){
        const valor = (destino[campo] ?? '').trim();
        if(valor !== ''){
            aEnviar[campo] = valor;
        }
    }
    return aEnviar;
}

function comoTexto(valor:unknown):string{
    return valor == null ? '' : String(valor).trim();
}

function detalleDe(bien:Record<string, unknown>, campo:CampoDelMovimiento):string|null{
    const columnas = COLUMNA_DE_DETALLE[campo] ?? [];
    for(const columna of columnas){
        const valor = comoTexto(bien[columna]);
        if(valor !== ''){
            return valor;
        }
    }
    return null;
}

export function origenDeCampo(
    bienes:readonly Record<string, unknown>[],
    campo:CampoDelMovimiento,
):OrigenDeCampo{
    const cuenta = new Map<string, ValorDeOrigen>();
    for(const bien of bienes){
        const separado = conCodigoAparte(bien, campo);
        const codigo = comoTexto(separado ? bien[`${campo}_codigo`] : bien[campo]);
        const clave = codigo === '' ? '' : codigo;
        const descripcion = (separado ? [campo] : [...COLUMNA_DE_TEXTO[campo], campo])
            .map(columna => comoTexto(bien[columna]))
            .find(texto => texto !== '');
        const anterior = cuenta.get(clave);
        if(anterior){
            anterior.cantidad++;
            anterior.detalle = anterior.detalle ?? detalleDe(bien, campo);
        }else{
            cuenta.set(clave, {
                codigo:codigo === '' ? null : codigo,
                texto:codigo === '' ? SIN_ASIGNAR : (descripcion ?? codigo),
                detalle:codigo === '' ? null : detalleDe(bien, campo),
                cantidad:1,
            });
        }
    }
    const valores = [...cuenta.values()].sort((a, b) =>
        b.cantidad - a.cantidad || a.texto.localeCompare(b.texto));
    const unico = valores.length === 1;
    return {valores, unico, codigoUnico:unico ? valores[0].codigo : null};
}

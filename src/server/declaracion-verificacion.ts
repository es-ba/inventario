"use strict";

/*
    Verificación del PDF firmado que se vuelve a cargar al sistema.

    El sistema no firma: el responsable aplica la firma digital fuera, con su token, y
    un administrativo sube el archivo resultante. Acá se controlan dos cosas:

    Nivel 1 — que el archivo sea un PDF y tenga una firma adentro. Detecta el error más
    frecuente en la práctica: subir el PDF que se descargó, sin firmar.

    Nivel 2 — que sea *este* documento. Una firma PAdES se aplica como incremental
    update: los bytes del documento original quedan intactos como prefijo del archivo
    firmado, y la firma se agrega al final. Comparar ese prefijo contra el archivo que
    emitió el sistema prueba que se firmó lo que corresponde y no otra cosa.

    No se valida la cadena de certificados ni la revocación (nivel 3): quedó fuera de
    alcance por decisión del proyecto. Por eso el nombre del firmante que se extrae acá
    es *declarado*, no verificado: sale de un campo del PDF y no prueba nada por sí solo.

    Módulo puro: entran Buffers, sale un resultado. Sin base ni sistema de archivos.
*/

const SUB_FILTERS_DE_FIRMA = [
    'adbe.pkcs7.detached',
    'adbe.pkcs7.sha1',
    'adbe.x509.rsa_sha1',
    'ETSI.CAdES.detached',
    'ETSI.RFC3161',
];

export type AnalisisFirma = {
    esPdf:boolean,
    firmaDetectada:boolean,
    subFilter:string|null,
    firmanteDeclarado:string|null,
    byteRange:number[]|null,
};

export type ComparacionPrefijo = {
    coincide:boolean,
    bytesEmitido:number,
    bytesSubido:number,
    primerByteDistinto:number|null,
};

export type DocumentoEmitido = {
    version:number,
    contenido:Buffer,
};

export type CodigoVerificacion =
    'firmado_ok'
    | 'no_es_pdf'
    | 'sin_firma'
    | 'version_anterior'
    | 'no_corresponde';

export type ResultadoVerificacion = {
    ok:boolean,
    codigo:CodigoVerificacion,
    mensaje:string,
    versionCoincidente:number|null,
    firmanteDeclarado:string|null,
    subFilter:string|null,
    comparacion:ComparacionPrefijo|null,
};

/** Los PDF válidos arrancan con %PDF- (la especificación permite basura antes, pero ningún firmador la produce). */
function tieneEncabezadoPdf(buffer:Buffer):boolean{
    return buffer.length > 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

/** Los strings de PDF pueden venir en UTF-16BE con BOM o en PDFDocEncoding. */
function decodificarStringPdf(crudo:string):string{
    const sinEscapes = crudo.replace(/\\([()\\])/g, '$1');
    if(sinEscapes.charCodeAt(0) === 0xFE && sinEscapes.charCodeAt(1) === 0xFF){
        let salida = '';
        for(let i = 2; i + 1 < sinEscapes.length; i += 2){
            salida += String.fromCharCode(
                (sinEscapes.charCodeAt(i) << 8) | sinEscapes.charCodeAt(i + 1)
            );
        }
        return salida.trim();
    }
    return sinEscapes.trim();
}

/**
 * Nivel 1: ¿es un PDF y tiene una firma adentro?
 * Además extrae, sin validarlo, el nombre que el PDF declara como firmante.
 */
export function analizarFirmaPdf(buffer:Buffer):AnalisisFirma{
    const esPdf = tieneEncabezadoPdf(buffer);
    if(!esPdf){
        return {esPdf:false, firmaDetectada:false, subFilter:null, firmanteDeclarado:null, byteRange:null};
    }
    const texto = buffer.toString('latin1');

    const subFilter = SUB_FILTERS_DE_FIRMA.find(candidato =>
        texto.includes(`/SubFilter /${candidato}`) || texto.includes(`/SubFilter/${candidato}`)
    ) ?? null;

    const byteRangeMatch = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(texto);
    const byteRange = byteRangeMatch
        ? [byteRangeMatch[1], byteRangeMatch[2], byteRangeMatch[3], byteRangeMatch[4]].map(Number)
        : null;

    const tieneDiccionarioSig = /\/Type\s*\/Sig\b/.test(texto) || /\/FT\s*\/Sig\b/.test(texto);
    const firmaDetectada = Boolean(byteRange) && (Boolean(subFilter) || tieneDiccionarioSig);

    let firmanteDeclarado:string|null = null;
    if(firmaDetectada){
        const nombreMatch = /\/Name\s*\(((?:\\.|[^()\\])*)\)/.exec(texto);
        if(nombreMatch){
            const decodificado = decodificarStringPdf(nombreMatch[1]);
            firmanteDeclarado = decodificado === '' ? null : decodificado;
        }
    }

    return {esPdf, firmaDetectada, subFilter, firmanteDeclarado, byteRange};
}

/**
 * Nivel 2: ¿el archivo emitido está intacto como prefijo del archivo subido?
 * Cuando no coincide informa el primer byte distinto, que es lo que permite
 * diagnosticar si el firmador reescribió el archivo en vez de anexarle la firma.
 */
export function compararPrefijo(emitido:Buffer, subido:Buffer):ComparacionPrefijo{
    const base:ComparacionPrefijo = {
        coincide:false,
        bytesEmitido:emitido.length,
        bytesSubido:subido.length,
        primerByteDistinto:null,
    };
    if(subido.length < emitido.length){
        return base;
    }
    const prefijo = subido.subarray(0, emitido.length);
    if(prefijo.equals(emitido)){
        return {...base, coincide:true};
    }
    let posicion = 0;
    while(posicion < emitido.length && emitido[posicion] === prefijo[posicion]){
        posicion++;
    }
    return {...base, primerByteDistinto:posicion};
}

function formatearBytes(cantidad:number):string{
    return cantidad.toLocaleString('es-AR');
}

/**
 * Verificación completa del documento que se sube.
 *
 * Se compara contra todas las versiones emitidas, no sólo la vigente: si alguien firmó
 * una versión que después se reemplazó, conviene decírselo con precisión en vez de
 * rechazar el archivo como inválido.
 */
export function verificarDeclaracionFirmada(opts:{
    subido:Buffer,
    emitidos:DocumentoEmitido[],
    versionVigente:number,
}):ResultadoVerificacion{
    const {subido, emitidos, versionVigente} = opts;
    const analisis = analizarFirmaPdf(subido);

    const base = {
        versionCoincidente:null,
        firmanteDeclarado:analisis.firmanteDeclarado,
        subFilter:analisis.subFilter,
        comparacion:null,
    };

    if(!analisis.esPdf){
        return {
            ...base,
            ok:false,
            codigo:'no_es_pdf',
            mensaje:'El archivo no es un PDF.',
        };
    }
    if(!analisis.firmaDetectada){
        return {
            ...base,
            ok:false,
            codigo:'sin_firma',
            mensaje:'El PDF no tiene una firma digital.'
                + ' Puede que se haya subido el documento tal como se descargó, sin firmar.',
        };
    }

    const vigente = emitidos.find(emitido => emitido.version === versionVigente) ?? null;
    const comparacionVigente = vigente ? compararPrefijo(vigente.contenido, subido) : null;

    if(comparacionVigente?.coincide){
        return {
            ...base,
            ok:true,
            codigo:'firmado_ok',
            versionCoincidente:versionVigente,
            comparacion:comparacionVigente,
            mensaje:`Firma verificada sobre la versión ${versionVigente}.`,
        };
    }

    const anterior = emitidos
        .filter(emitido => emitido.version !== versionVigente)
        .find(emitido => compararPrefijo(emitido.contenido, subido).coincide);

    if(anterior){
        return {
            ...base,
            ok:false,
            codigo:'version_anterior',
            versionCoincidente:anterior.version,
            comparacion:comparacionVigente,
            mensaje:`El archivo firmado corresponde a la versión ${anterior.version},`
                + ` que fue reemplazada por la versión ${versionVigente}.`
                + ` Hay que firmar el documento vigente.`,
        };
    }

    const detalle = comparacionVigente == null
        ? 'no se encontró el archivo emitido para comparar'
        : comparacionVigente.bytesSubido < comparacionVigente.bytesEmitido
            ? `el archivo subido (${formatearBytes(comparacionVigente.bytesSubido)} bytes)`
                + ` es más chico que el emitido (${formatearBytes(comparacionVigente.bytesEmitido)} bytes)`
            : `difiere a partir del byte ${formatearBytes(comparacionVigente.primerByteDistinto ?? 0)}`
                + ` de ${formatearBytes(comparacionVigente.bytesEmitido)}`;

    return {
        ...base,
        ok:false,
        codigo:'no_corresponde',
        comparacion:comparacionVigente,
        mensaje:`El PDF está firmado pero no es el documento que emitió el sistema:`
            + ` ${detalle}.`,
    };
}

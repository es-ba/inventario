"use strict";


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
    'no_verificable'
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

function tieneEncabezadoPdf(buffer:Buffer):boolean{
    return buffer.length > 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

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
    // Sólo detecta una estructura candidata. Ni estos marcadores ni la cobertura
    // de bytes prueban la firma CMS, el certificado o el contenido visual del PDF.
    const rangoCoherente = byteRange != null
        && byteRange.every(Number.isSafeInteger)
        && byteRange[0] === 0 && byteRange[1] > 0
        && byteRange[2] > byteRange[1] && byteRange[3] > 0
        && byteRange[2] + byteRange[3] === buffer.length;
    const hueco = rangoCoherente ? texto.slice(byteRange![1], byteRange![2]) : '';
    const huecoEsContents = /^<[\da-fA-F\s]+>$/.test(hueco)
        && /\/Contents\s*$/.test(texto.slice(0, byteRange![1]));
    const firmaDetectada = rangoCoherente && huecoEsContents
        && Boolean(subFilter) && tieneDiccionarioSig;

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
            mensaje:'No se detectó una estructura de firma digital verificable en el PDF.',
        };
    }

    const vigente = emitidos.find(emitido => emitido.version === versionVigente) ?? null;
    const comparacionVigente = vigente ? compararPrefijo(vigente.contenido, subido) : null;

    if(comparacionVigente?.coincide){
        return {
            ...base,
            ok:false,
            codigo:'no_verificable',
            versionCoincidente:versionVigente,
            comparacion:comparacionVigente,
            mensaje:`Se detectó una estructura de firma y el prefijo de la versión ${versionVigente}.`
                + ' La firma, el certificado y los cambios posteriores no fueron validados criptográficamente.',
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
            mensaje:`El archivo recibido corresponde a la versión ${anterior.version},`
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
        mensaje:`El PDF no conserva el documento que emitió el sistema:`
            + ` ${detalle}.`,
    };
}

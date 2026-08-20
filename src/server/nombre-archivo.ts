"use strict";

/*
    Nombre con el que se baja un documento.

    Los archivos en disco se llaman por su clave técnica —"solicitudes/A-2026-1/acta-v1.pdf"—
    porque así no chocan entre sí. Eso le sirve al servidor y no a la persona: en la carpeta
    de descargas quedan diez "acta-v1.pdf" sin forma de distinguirlos.

    Acá se arma el nombre visible, con los datos por los que uno busca un documento: de qué
    es, de quién y de cuándo.
*/

/*
    Caracteres que no puede tener un nombre de archivo en Windows ni en Linux. El guión y el
    espacio sí pueden, y hay que dejarlos: sacarlos rompería las fechas y pegotearía las
    palabras.
*/
const PROHIBIDOS = /[\\/:*?"<>|]/g;

/** Largo máximo antes de la extensión: los sistemas de archivos cortan cerca de 255. */
const LARGO_MAXIMO = 120;

/**
 * Deja un texto usable como parte de un nombre de archivo, sin cambiar lo que dice: se
 * sacan los caracteres prohibidos y se colapsan los espacios, nada más.
 */
export function parteDeNombre(valor:unknown):string{
    return String(valor ?? '')
        .replace(PROHIBIDOS, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Fecha como AAAA-MM-DD, que ordena bien alfabéticamente. Acepta lo que mande la base. */
export function fechaParaNombre(valor:unknown):string{
    if(valor == null || valor === ''){
        return '';
    }
    if(valor instanceof Date && !Number.isNaN(valor.getTime())){
        const mes = String(valor.getMonth() + 1).padStart(2, '0');
        const dia = String(valor.getDate()).padStart(2, '0');
        return `${valor.getFullYear()}-${mes}-${dia}`;
    }
    if(typeof valor === 'object'){
        // Los date de best-globals no extienden Date, pero saben darse en ISO.
        const posible = valor as {toYmd?:() => string};
        if(typeof posible.toYmd === 'function'){
            return posible.toYmd();
        }
    }
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(valor).trim());
    return m ? m[1] : '';
}

/**
 * Arma el nombre uniendo las partes que tengan contenido. Las vacías se descartan en vez de
 * dejar separadores colgando: un documento sin responsable cargado no tiene por qué bajarse
 * como "declaracion 41 -  - 2026-08-20.pdf".
 */
export function nombreDeArchivo(partes:unknown[], extension = 'pdf'):string{
    const cuerpo = partes
        .map(parteDeNombre)
        .filter(parte => parte !== '')
        .join(' - ')
        .slice(0, LARGO_MAXIMO)
        .trim();
    const base = cuerpo === '' ? 'documento' : cuerpo;
    return `${base}.${extension}`;
}

/**
 * Valor del header Content-Disposition.
 *
 * Va el nombre entrecomillado y además filename*, que es el que entienden los navegadores
 * para acentos y eñes: en el entrecomillado a secas, "declaración" llega roto.
 */
export function contentDisposition(nombre:string):string{
    const seguro = nombre.replace(/"/g, '');
    return `attachment; filename="${seguro}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}

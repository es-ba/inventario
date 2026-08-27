"use strict";

const PROHIBIDOS = /[\\/:*?"<>|]/g;

const LARGO_MAXIMO = 120;

export function parteDeNombre(valor:unknown):string{
    return String(valor ?? '')
        .replace(PROHIBIDOS, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

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
        const posible = valor as {toYmd?:() => string};
        if(typeof posible.toYmd === 'function'){
            return posible.toYmd();
        }
    }
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(valor).trim());
    return m ? m[1] : '';
}

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

export function contentDisposition(nombre:string):string{
    const seguro = nombre.replace(/"/g, '');
    return `attachment; filename="${seguro}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}

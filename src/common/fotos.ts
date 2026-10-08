export const LADO_MAXIMO = 1600;

export const PESO_MAXIMO = 5 * 1024 * 1024;

export const NOMBRE_DE_FOTO = 'foto.jpg';

export function medidasDeFoto(ancho:number, alto:number):{ancho:number, alto:number}{
    const escala = Math.min(1, LADO_MAXIMO / Math.max(ancho, alto));
    return {
        ancho:Math.max(1, Math.round(ancho * escala)),
        alto:Math.max(1, Math.round(alto * escala)),
    };
}

export function esJpeg(bytes:ArrayLike<number>):boolean{
    return bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
}

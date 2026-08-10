type ImagenCargable = Pick<
    HTMLImageElement,
    'complete'|'naturalWidth'|'addEventListener'
>;

const IMAGE_ERROR_MESSAGE = 'No se pudo cargar el escudo de la Ciudad.';

export function esperarImagen(image:ImagenCargable):Promise<void>{
    if(image.complete){
        return image.naturalWidth > 0
            ? Promise.resolve()
            : Promise.reject(new Error(IMAGE_ERROR_MESSAGE));
    }
    return new Promise((resolve, reject) => {
        image.addEventListener('load', () => resolve(), {once:true});
        image.addEventListener(
            'error',
            () => reject(new Error(IMAGE_ERROR_MESSAGE)),
            {once:true},
        );
    });
}

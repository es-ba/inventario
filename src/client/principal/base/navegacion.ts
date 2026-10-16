export type ItemDeMenu = {
    menuType:string;
    name:string;
    label?:string;
    visible?:boolean;
    menuContent?:ItemDeMenu[];
};

export type EntradaDeNavegacion = {
    clave:string;
    etiqueta:string;
    hash?:string;
    hijos?:EntradaDeNavegacion[];
};

export function entradasDeNavegacion(menu:ItemDeMenu[], padres:string[] = []):EntradaDeNavegacion[]{
    return menu.filter(item => item.visible !== false).map(item => {
        const ruta = [...padres, item.name];
        const clave = ruta.join(',');
        const etiqueta = item.label || item.name.replace(/_/g, ' ');
        return item.menuType === 'menu'
            ? {clave, etiqueta, hijos:entradasDeNavegacion(item.menuContent ?? [], ruta)}
            : {clave, etiqueta, hash:`i=${ruta.map(encodeURIComponent).join(',')}`};
    });
}

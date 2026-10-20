import type {EntradaDeNavegacion} from '../base/navegacion';

export type Destino = {nombre:string, titulo:string, descripcion:string, hash:string};

type Curado = {nombre:string, titulo?:string, descripcion:string};

export const TAREAS:Curado[] = [
    {nombre:'principal', titulo:'Buscar bienes', descripcion:'Encontrá un bien por ficha, serie o descripción y abrí su ficha.'},
    {nombre:'mis_bienes', titulo:'Mis bienes', descripcion:'Los bienes que tenés a tu cargo y los que están en uso tuyo.'},
    {nombre:'control_bienes', titulo:'Controlar bienes', descripcion:'Registrá el control físico de un bien leyendo su etiqueta.'},
    {nombre:'ayuda', titulo:'Manual de uso', descripcion:'Cómo se usa cada pantalla, paso a paso.'},
];

export const REPORTES:Curado[] = [
    {nombre:'bienes_por_categoria', descripcion:'Qué tipo de bienes hay y en qué estado están.'},
    {nombre:'bienes_por_sector', descripcion:'El organigrama, área por área.'},
    {nombre:'bienes_por_responsable', descripcion:'Qué tiene a cargo o en uso cada persona.'},
    {nombre:'bienes_por_modelo', descripcion:'Marcas y atributos de cada subcategoría.'},
    {nombre:'reporte_bienes_por_espacio', descripcion:'Los bienes de cada espacio físico.'},
];

function encontrar(entradas:EntradaDeNavegacion[], nombre:string):EntradaDeNavegacion|undefined{
    for(const entrada of entradas){
        if(entrada.clave.split(',').pop() === nombre){
            return entrada;
        }
        const adentro = entrada.hijos && encontrar(entrada.hijos, nombre);
        if(adentro){
            return adentro;
        }
    }
    return undefined;
}

function primerHash(entrada:EntradaDeNavegacion):string|undefined{
    return entrada.hijos ? entrada.hijos.map(primerHash).find(hash => hash != null) : entrada.hash;
}

export function destinosDisponibles(entradas:EntradaDeNavegacion[], curados:Curado[]):Destino[]{
    return curados.reduce<Destino[]>((destinos, curado) => {
        const entrada = encontrar(entradas, curado.nombre);
        const hash = entrada && primerHash(entrada);
        return entrada && hash
            ? destinos.concat({nombre:curado.nombre, titulo:curado.titulo ?? entrada.etiqueta, descripcion:curado.descripcion, hash})
            : destinos;
    }, []);
}

export function saludo(hora:number):string{
    return hora < 6 ? 'Buenas noches' : hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
}

export function nombreDePila(nombre:string|null|undefined):string{
    const primero = (nombre ?? '').trim().split(/\s+/)[0] ?? '';
    return primero.charAt(0).toLocaleUpperCase('es') + primero.slice(1).toLocaleLowerCase('es');
}

export function hashDeBusquedaRapida(texto:string):string{
    const limpio = texto.trim();
    return limpio ? `w=principal&texto=${encodeURIComponent(limpio)}` : 'w=principal';
}

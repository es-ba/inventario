"use strict";

import {createHash} from 'node:crypto';


export type DeclaracionInstitucional = {
    organismo:string,
    dependencia?:string|null,
    lema?:string|null,
    institucionalPatrimonio:string,
};

export const INSTITUCIONAL_POR_DEFECTO:DeclaracionInstitucional = {
    organismo:'Instituto de Estadística y Censos de la Ciudad Autónoma de Buenos Aires',
    dependencia:null,
    lema:null,
    institucionalPatrimonio:
        '2.60.3.1.1691.0.0 - Instituto de Estadística y Censos de la Ciudad Autónoma de Buenos Aires',
};

export type DeclaracionCabecera = {
    declaracion:number|string,
    fecha:unknown,
    responsable?:string|null,
    responsable_nombre?:string|null,
    responsable_apellido?:string|null,
    sector?:string|null,
    sector_nombre?:string|null,
    observaciones?:string|null,
};

export type DeclaracionBienFila = {
    ficha:string,
    detalle?:string|null,
    observacion?:string|null,
    rubro?:string|null,
    clase?:string|null,
    cuenta?:string|null,
    cuenta_nombre?:string|null,
    marca?:string|null,
    marca_descripcion?:string|null,
};

export type DeclaracionEmision = {
    version:number,
    fecha:unknown,
    usuario?:string|null,
};

export type DeclaracionDocParams = {
    cabecera:DeclaracionCabecera,
    bienes:DeclaracionBienFila[],
    emision:DeclaracionEmision,
    logo?:string|null,
    institucional?:DeclaracionInstitucional,
};

const SIN_DATO = '—';
const SIN_MARCA = 'Sin Marca';

export const PAGINA = {ancho:595.28, alto:841.89};

export const RECT_CAMPO_FIRMA = {x:338, y:14, ancho:220, alto:46};

export function yDesdeArriba(yPdf:number, alto:number = 0):number{
    return PAGINA.alto - yPdf - alto;
}

export function formatearFecha(value:unknown):string{
    if(value == null || value === ''){
        return SIN_DATO;
    }
    if(value instanceof Date){
        return [
            String(value.getDate()).padStart(2, '0'),
            String(value.getMonth() + 1).padStart(2, '0'),
            String(value.getFullYear()),
        ].join('/');
    }
    if(typeof value === 'object'){
        const posible = value as {toDmy?:()=>string, toYmd?:()=>string};
        if(typeof posible.toDmy === 'function'){
            return posible.toDmy();
        }
        if(typeof posible.toYmd === 'function'){
            return formatearFecha(posible.toYmd());
        }
    }
    const texto = String(value).trim();
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
    if(isoMatch){
        return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    return texto;
}

export function anioDeclaracion(fecha:unknown):string{
    const formateada = formatearFecha(fecha);
    const match = /(\d{4})$/.exec(formateada);
    return match ? match[1] : SIN_DATO;
}

function textoOSinDato(value:unknown):string{
    const texto = value == null ? '' : String(value).trim();
    return texto === '' ? SIN_DATO : texto;
}

export function rubroPatrimonial(bien:DeclaracionBienFila):string{
    const codigo = [bien.rubro, bien.clase, bien.cuenta]
        .map(parte => parte == null ? '' : String(parte).trim())
        .filter(parte => parte !== '')
        .join('.');
    const nombre = bien.cuenta_nombre == null ? '' : String(bien.cuenta_nombre).trim();
    if(codigo === '' && nombre === ''){
        return SIN_DATO;
    }
    if(codigo === ''){
        return nombre;
    }
    if(nombre === ''){
        return codigo;
    }
    return `${codigo} - ${nombre}`;
}

export function marcaBien(bien:DeclaracionBienFila):string{
    const descripcion = bien.marca_descripcion == null ? '' : String(bien.marca_descripcion).trim();
    if(descripcion !== ''){
        return descripcion;
    }
    const codigo = bien.marca == null ? '' : String(bien.marca).trim();
    return codigo !== '' ? codigo : SIN_MARCA;
}

export function descripcionBien(bien:DeclaracionBienFila):string{
    const detalle = bien.detalle == null ? '' : String(bien.detalle).trim();
    if(detalle !== ''){
        return detalle;
    }
    return textoOSinDato(bien.observacion);
}

export function nombreResponsable(cabecera:DeclaracionCabecera):string{
    const partes = [cabecera.responsable_nombre, cabecera.responsable_apellido]
        .map(parte => parte == null ? '' : String(parte).trim())
        .filter(parte => parte !== '');
    if(partes.length){
        return partes.join(' ');
    }
    return textoOSinDato(cabecera.responsable);
}

export function ordenarBienes(bienes:DeclaracionBienFila[]):DeclaracionBienFila[]{
    return [...bienes].sort((a, b) =>
        String(a.ficha).localeCompare(String(b.ficha), 'es', {numeric:true})
    );
}

export function calcularCodigoContenido(
    cabecera:DeclaracionCabecera,
    bienes:DeclaracionBienFila[],
    version:number,
):string{
    const filas = ordenarBienes(bienes).map(bien => [
        bien.ficha,
        rubroPatrimonial(bien),
        descripcionBien(bien),
        marcaBien(bien),
    ].join('|'));
    const canonico = [
        `declaracion:${cabecera.declaracion}`,
        `version:${version}`,
        `responsable:${textoOSinDato(cabecera.responsable)}`,
        `sector:${textoOSinDato(cabecera.sector)}`,
        `bienes:${filas.length}`,
        ...filas,
    ].join('\n');
    return createHash('sha256').update(canonico, 'utf8').digest('hex')
        .slice(0, 16).toUpperCase();
}

const COLUMNAS = [
    {titulo:'Item'               , ancho:28},
    {titulo:'Ficha'              , ancho:52},
    {titulo:'Rubro Patrimonial'  , ancho:186},
    {titulo:'Descripción del Bien', ancho:'*' as const},
    {titulo:'Marca'              , ancho:78},
];

function filaBien(bien:DeclaracionBienFila, indice:number):unknown[]{
    return [
        {text:String(indice + 1), alignment:'right'},
        textoOSinDato(bien.ficha),
        rubroPatrimonial(bien),
        descripcionBien(bien),
        marcaBien(bien),
    ];
}

export function buildDeclaracionDocDefinition(params:DeclaracionDocParams):Record<string, any>{
    const {cabecera, emision, logo} = params;
    const institucional = params.institucional ?? INSTITUCIONAL_POR_DEFECTO;
    const bienes = ordenarBienes(params.bienes);
    const codigoContenido = calcularCodigoContenido(cabecera, bienes, emision.version);
    const responsable = nombreResponsable(cabecera);
    const sector = textoOSinDato(cabecera.sector_nombre ?? cabecera.sector);
    const anio = anioDeclaracion(cabecera.fecha);

    const identificacion:unknown[] = [];
    if(logo){
        identificacion.push({image:logo, width:150, margin:[0, 0, 10, 0]});
    }
    identificacion.push({
        width:'*',
        stack:[
            ...(logo ? [] : [{text:institucional.organismo, style:'organismo'}]),
            ...(institucional.dependencia ? [{text:institucional.dependencia, style:'organismo'}] : []),
            ...(institucional.lema ? [{text:institucional.lema, style:'lema'}] : []),
        ],
    });
    identificacion.push({
        width:'auto',
        alignment:'right',
        stack:[
            {text:['Fecha de impresión: ', {text:formatearFecha(emision.fecha), bold:true}], style:'etiqueta'},
            {text:['Usuario: ', {text:textoOSinDato(emision.usuario), bold:true}], style:'etiqueta'},
        ],
    });

    return {
        pageSize:'A4',
        pageOrientation:'portrait',
        pageMargins:[36, 36, 36, 76],
        info:{
            title:`Informe de Inventario detallado - declaración ${cabecera.declaracion} (v${emision.version})`,
            author:`Sistema de inventario - ${institucional.organismo}`,
            subject:`Declaración ${cabecera.declaracion}`,
        },
        defaultStyle:{font:'Roboto', fontSize:8},
        styles:{
            organismo:{fontSize:9, bold:true},
            lema:{fontSize:7, italics:true, color:'#555555'},
            titulo:{fontSize:12, bold:true, alignment:'center', margin:[0, 8, 0, 6]},
            etiqueta:{fontSize:7, color:'#555555'},
            datoEtiqueta:{fontSize:8, color:'#555555'},
            datoValor:{fontSize:9, bold:true},
            encabezadoTabla:{fontSize:8, bold:true, color:'#ffffff', fillColor:'#4a5568'},
            pie:{fontSize:7, color:'#666666'},
            firma:{fontSize:8, bold:true},
        },
        content:[
            {columns:identificacion, margin:[0, 0, 0, 2]},
            {text:'Informe de Inventario detallado', style:'titulo'},
            {
                text:[
                    {text:'Institucional de Patrimonio: ', style:'datoEtiqueta'},
                    {text:institucional.institucionalPatrimonio, style:'datoValor'},
                ],
                margin:[0, 0, 0, 4],
            },
            {
                table:{
                    widths:['auto', '*', 'auto', 'auto'],
                    body:[
                        [
                            {text:'Sector:', style:'datoEtiqueta'},
                            {text:sector, style:'datoValor'},
                            {text:'Declaración N°:', style:'datoEtiqueta'},
                            {text:String(cabecera.declaracion), style:'datoValor'},
                        ],
                        [
                            {text:'Responsable:', style:'datoEtiqueta'},
                            {text:responsable, style:'datoValor'},
                            {text:'Año:', style:'datoEtiqueta'},
                            {text:anio, style:'datoValor'},
                        ],
                        [
                            {text:'Bienes declarados:', style:'datoEtiqueta'},
                            {text:String(bienes.length), style:'datoValor'},
                            {text:'Versión:', style:'datoEtiqueta'},
                            {text:String(emision.version), style:'datoValor'},
                        ],
                    ],
                },
                layout:'noBorders',
                margin:[0, 0, 0, 8],
            },
            ...(textoOSinDato(cabecera.observaciones) === SIN_DATO ? [] : [{
                text:[{text:'Observaciones: ', style:'datoEtiqueta'}, String(cabecera.observaciones).trim()],
                margin:[0, 0, 0, 8],
            }]),
            {
                table:{
                    headerRows:1,
                    dontBreakRows:true,
                    widths:COLUMNAS.map(columna => columna.ancho),
                    body:[
                        COLUMNAS.map(columna => ({text:columna.titulo, style:'encabezadoTabla'})),
                        ...bienes.map(filaBien),
                    ],
                },
                layout:{
                    hLineWidth:(i:number, node:any) =>
                        i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.3,
                    vLineWidth:() => 0.3,
                    hLineColor:() => '#999999',
                    vLineColor:() => '#cccccc',
                    fillColor:(rowIndex:number) =>
                        rowIndex > 0 && rowIndex % 2 === 0 ? '#f4f4f4' : null,
                },
            },
        ],
        footer:(currentPage:number, pageCount:number) => {
            const partes:unknown[] = [{
                margin:[36, 8, 36, 0],
                columns:[
                    {
                        width:'*',
                        style:'pie',
                        text:`Declaración ${cabecera.declaracion} · versión ${emision.version}`
                            + ` · código ${codigoContenido}`,
                    },
                    {
                        width:'auto',
                        style:'pie',
                        alignment:'right',
                        text:`Página ${currentPage} de ${pageCount}`,
                    },
                ],
            }];
            if(currentPage === pageCount){
                partes.push({
                    absolutePosition:{
                        x:RECT_CAMPO_FIRMA.x,
                        y:yDesdeArriba(RECT_CAMPO_FIRMA.y + RECT_CAMPO_FIRMA.alto + 10),
                    },
                    width:RECT_CAMPO_FIRMA.ancho,
                    style:'etiqueta',
                    text:`FIRMA DIGITAL DE ${responsable}`,
                });
                partes.push({
                    absolutePosition:{
                        x:RECT_CAMPO_FIRMA.x,
                        y:yDesdeArriba(RECT_CAMPO_FIRMA.y, RECT_CAMPO_FIRMA.alto),
                    },
                    canvas:[{
                        type:'rect',
                        x:0,
                        y:0,
                        w:RECT_CAMPO_FIRMA.ancho,
                        h:RECT_CAMPO_FIRMA.alto,
                        lineWidth:0.8,
                        lineColor:'#4a5568',
                        dash:{length:3, space:2},
                    }],
                });
            }
            return partes;
        },
    };
}

"use strict";

import {createHash} from 'node:crypto';

/*
    Armado del documento de una declaración de bienes.

    El formato replica el "Informe de Inventario detallado" del sistema anterior
    (Crystal Reports, Reports/DeclaracionAdjunta.rpt): cinco columnas —Item, Ficha,
    Rubro Patrimonial, Descripción del Bien, Marca— y el bloque de firma repetido al
    pie de cada página. Los códigos nunca se imprimen solos: van siempre acompañados
    de su descripción, que es lo que el responsable puede reconocer.

    Este módulo es puro a propósito: construye la definición del documento (un objeto
    plano) y el código de contenido, sin tocar pdfmake ni el sistema de archivos.
    El render vive en declaracion-pdf-render.ts.
*/

export type DeclaracionInstitucional = {
    /** Se usa como texto sólo cuando no hay logo: el logo institucional ya lo incluye. */
    organismo:string,
    dependencia?:string|null,
    lema?:string|null,
    institucionalPatrimonio:string,
};

export const INSTITUCIONAL_POR_DEFECTO:DeclaracionInstitucional = {
    organismo:'Instituto de Estadística y Censos de la Ciudad Autónoma de Buenos Aires',
    dependencia:null,
    lema:null,
    // TODO: confirmar el código patrimonial. El número viene del informe anterior, de
    // cuando el organismo era una Dirección General; con el cambio a Instituto puede
    // haber cambiado.
    institucionalPatrimonio:
        '2.60.3.1.1691.0.0 - Instituto de Estadística y Censos de la Ciudad Autónoma de Buenos Aires',
};

export type DeclaracionCabecera = {
    declaracion:number|string,
    fecha:unknown,
    responsable?:string|null,
    responsable_nombre?:string|null,
    responsable_apellido?:string|null,
    area?:string|null,
    area_nombre?:string|null,
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

/** A4 en puntos. */
export const PAGINA = {ancho:595.28, alto:841.89};

/**
 * Recuadro donde va el campo de firma, en coordenadas PDF (origen abajo a la izquierda).
 * Lo comparten el dibujo del recuadro —que hace pdfmake— y el campo AcroForm que agrega
 * declaracion-firma-campo.ts, para que no se desalineen.
 */
export const RECT_CAMPO_FIRMA = {x:338, y:14, ancho:220, alto:46};

/** pdfmake posiciona desde arriba; el PDF mide desde abajo. */
export function yDesdeArriba(yPdf:number, alto:number = 0):number{
    return PAGINA.alto - yPdf - alto;
}

/** Las fechas llegan como Date, como texto o como los objetos date de best-globals. */
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

/** El año de la declaración, que en el informe va como "Año: 2018". */
export function anioDeclaracion(fecha:unknown):string{
    const formateada = formatearFecha(fecha);
    const match = /(\d{4})$/.exec(formateada);
    return match ? match[1] : SIN_DATO;
}

function textoOSinDato(value:unknown):string{
    const texto = value == null ? '' : String(value).trim();
    return texto === '' ? SIN_DATO : texto;
}

/**
 * Rubro patrimonial como lo mostraba el sistema anterior:
 * "3.6.1 - Equipamientos de Escritorio y Dispositivos Externos".
 * El código solo no le dice nada a nadie, así que va con la descripción de la cuenta.
 */
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

/** La marca por su descripción. Sin marca cargada, el informe viejo imprime "Sin Marca". */
export function marcaBien(bien:DeclaracionBienFila):string{
    const descripcion = bien.marca_descripcion == null ? '' : String(bien.marca_descripcion).trim();
    if(descripcion !== ''){
        return descripcion;
    }
    const codigo = bien.marca == null ? '' : String(bien.marca).trim();
    return codigo !== '' ? codigo : SIN_MARCA;
}

/** "Descripción del Bien": el detalle, y si está vacío la observación. */
export function descripcionBien(bien:DeclaracionBienFila):string{
    const detalle = bien.detalle == null ? '' : String(bien.detalle).trim();
    if(detalle !== ''){
        return detalle;
    }
    return textoOSinDato(bien.observacion);
}

/** El responsable se imprime "NOMBRE APELLIDO", como en el informe anterior. */
export function nombreResponsable(cabecera:DeclaracionCabecera):string{
    const partes = [cabecera.responsable_nombre, cabecera.responsable_apellido]
        .map(parte => parte == null ? '' : String(parte).trim())
        .filter(parte => parte !== '');
    if(partes.length){
        return partes.join(' ');
    }
    return textoOSinDato(cabecera.responsable);
}

/**
 * Ordena los bienes por ficha de forma estable, para que dos emisiones del mismo
 * contenido produzcan el mismo documento y el mismo código.
 */
export function ordenarBienes(bienes:DeclaracionBienFila[]):DeclaracionBienFila[]{
    return [...bienes].sort((a, b) =>
        String(a.ficha).localeCompare(String(b.ficha), 'es', {numeric:true})
    );
}

/**
 * Código corto que identifica el contenido declarado. Se imprime en el documento
 * para poder cotejar a ojo un papel contra el sistema.
 *
 * Es el hash del contenido, no del archivo: el hash del PDF no puede imprimirse
 * dentro del propio PDF. El hash del archivo se guarda en declaraciones_documentos.
 */
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
        `area:${textoOSinDato(cabecera.area)}`,
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

/**
 * Definición del documento para pdfmake. Devuelve un objeto plano: no genera el PDF.
 */
export function buildDeclaracionDocDefinition(params:DeclaracionDocParams):Record<string, any>{
    const {cabecera, emision, logo} = params;
    const institucional = params.institucional ?? INSTITUCIONAL_POR_DEFECTO;
    const bienes = ordenarBienes(params.bienes);
    const codigoContenido = calcularCodigoContenido(cabecera, bienes, emision.version);
    const responsable = nombreResponsable(cabecera);
    const sector = textoOSinDato(cabecera.area_nombre ?? cabecera.area);
    const anio = anioDeclaracion(cabecera.fecha);

    // El logo institucional ya trae el nombre del organismo, así que no se repite como
    // texto: sólo se escribe cuando el logo no está disponible.
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
        /*
            El pie lleva la identificación en todas las páginas. El recuadro de firma va
            sólo en la última: una firma digital cubre el documento entero, así que no
            tiene sentido repetirla por página como hacía el informe en papel.

            El recuadro se dibuja en posición absoluta para que coincida exactamente con
            el campo AcroForm que se agrega después sobre las mismas coordenadas.
        */
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

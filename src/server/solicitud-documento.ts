"use strict";

import {createHash} from 'node:crypto';

/*
    Documentos de una solicitud de movimiento.

    Dos formularios del organismo, con la misma tabla de ítems y cabeceras distintas:

      - F-SA-12   Comodato: préstamo de uso a una persona, con once cláusulas fijas.
      - F-751-04  Acta de entrega y devolución de equipamiento informático.

    Módulo puro: arma la definición del documento y el código de contenido, sin tocar
    pdfmake ni el sistema de archivos. El render vive en solicitud-documento-render.ts.

    Los datos personales —DNI, domicilio, teléfono, carácter, situación de revista— salen
    de la ficha del responsable. El que esté vacío se imprime como línea de puntos para
    completar a mano, de modo que el documento sirve igual con la ficha incompleta.
*/

export type TipoDocumentoSolicitud = 'comodato' | 'acta';

/*
    El F-751-04 es un solo formulario para las dos puntas del circuito: en el original la
    elección está en dos combos —uno en el título y otro en el cuerpo— que hay que mover
    juntos. Acá es un solo dato y los dos textos salen de él.
*/
export type OperacionActa = 'entrega' | 'devolucion';

const TEXTO_OPERACION:Record<OperacionActa, {titulo:string, frase:string}> = {
    entrega:{titulo:'entrega', frase:'hace entrega de'},
    devolucion:{titulo:'devolución', frase:'hace devolución de'},
};

export function operacionDeActa(valor:unknown):OperacionActa{
    return valor === 'devolucion' ? 'devolucion' : 'entrega';
}

export type ItemDocumento = {
    ficha:string,
    /** En el formulario la columna se llama ESTANTE y se completa con el tipo de bien. */
    tipo_bien?:string|null,
    detalle?:string|null,
    marca?:string|null,
    modelo?:string|null,
    serie?:string|null,
    imei?:string|null,
};

export type Persona = {
    nombre?:string|null,
    dni?:string|null,
    domicilio?:string|null,
    caracter?:string|null,
    situacionRevista?:string|null,
    mail?:string|null,
    telefono?:string|null,
};

export type CabeceraDocumento = {
    acta:string,
    fecha:unknown,
    /** Quién firma por el organismo y en qué carácter. */
    representante?:string|null,
    caracterRepresentante?:string|null,
    /** La contraparte: comodatario en el comodato, quien recibe en el acta. */
    persona:Persona,
    /** Sólo para el acta: en representación de qué actúa cada parte. */
    entregaRepresenta?:string|null,
    recibeRepresenta?:string|null,
    /** Sólo para el acta: si el acta documenta una entrega o una devolución. */
    operacion?:OperacionActa|null,
};

export type DocumentoParams = {
    tipo:TipoDocumentoSolicitud,
    cabecera:CabeceraDocumento,
    items:ItemDocumento[],
    emision:{version:number, fecha:unknown, usuario?:string|null},
    logo?:string|null,
};

const ORGANISMO = 'Instituto de Estadística y Censos de la Ciudad Autónoma de Buenos Aires';
const DEPARTAMENTO = 'Departamento Patrimonio, Mesa de Entrada y Logística';

export const CODIGO_FORMULARIO:Record<TipoDocumentoSolicitud, string> = {
    comodato:'F-SA-12 Rev. 7',
    acta:'F-751-04 rev. 6',
};

export const TITULO_DOCUMENTO:Record<TipoDocumentoSolicitud, string> = {
    comodato:'COMODATO',
    acta:'Acta de entrega y devolución de equipamiento informático',
};

/** El título del acta se cierra según la operación; el del comodato es fijo. */
export function tituloDocumento(tipo:TipoDocumentoSolicitud, cabecera:CabeceraDocumento):string{
    if(tipo !== 'acta'){
        return TITULO_DOCUMENTO[tipo];
    }
    const {titulo} = TEXTO_OPERACION[operacionDeActa(cabecera.operacion)];
    return `Acta de ${titulo} de equipamiento informático`;
}

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const EN_LETRAS = [
    'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
    'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
    'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés',
    'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho',
    'veintinueve', 'treinta', 'treinta y uno',
];

/** Los blancos del formulario se imprimen como línea de puntos para completar a mano. */
export const PUNTOS = '.'.repeat(40);

export function enLetras(n:number):string{
    return EN_LETRAS[n] ?? String(n);
}

/** Descompone la fecha; acepta Date, texto ISO o los objetos date de best-globals. */
export function partesDeFecha(value:unknown):{dia:number, mes:number, anio:number}|null{
    if(value == null || value === ''){
        return null;
    }
    if(value instanceof Date && !Number.isNaN(value.getTime())){
        return {dia:value.getDate(), mes:value.getMonth() + 1, anio:value.getFullYear()};
    }
    if(typeof value === 'object'){
        const posible = value as {toYmd?:()=>string};
        if(typeof posible.toYmd === 'function'){
            return partesDeFecha(posible.toYmd());
        }
    }
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
    return m ? {dia:Number(m[3]), mes:Number(m[2]), anio:Number(m[1])} : null;
}

export function fechaCorta(value:unknown):string{
    const p = partesDeFecha(value);
    if(!p){
        return PUNTOS.slice(0, 14);
    }
    return `${String(p.dia).padStart(2, '0')}/${String(p.mes).padStart(2, '0')}/${p.anio}`;
}

/** "a los quince (15) días del mes de marzo de 2026", como pide el cierre del comodato. */
export function fechaEnLetras(value:unknown):string{
    const p = partesDeFecha(value);
    if(!p){
        return `a los ${PUNTOS.slice(0, 12)} ( ) días del mes de ${PUNTOS.slice(0, 16)} de 20${PUNTOS.slice(0, 4)}`;
    }
    return `a los ${enLetras(p.dia)} (${p.dia}) días del mes de ${MESES[p.mes - 1]} de ${p.anio}`;
}

/** Un dato que puede no existir todavía: si falta, va la línea de puntos. */
export function dato(valor:unknown, largo = 30):string{
    const texto = valor == null ? '' : String(valor).trim();
    return texto !== '' ? texto : PUNTOS.slice(0, largo);
}

/*
    Marca de un hueco completable.

    pdfmake no sabe generar campos AcroForm, y las coordenadas de un hueco metido en medio
    de un párrafo justificado sólo las conoce él después de maquetar. La salida es pedirle
    un link: pdfkit deja una anotación con el rectángulo exacto del fragmento, y después
    solicitud-documento-formulario.ts la reemplaza por un campo de texto en ese mismo lugar.

    El prefijo no es una URL de verdad; nunca sale del archivo, se consume al convertir.
*/
export const PREFIJO_CAMPO = 'campo:';

/**
 * Nombre reservado: el hueco así marcado no se vuelve un campo de texto, sólo indica dónde
 * apoyar el campo de firma digital.
 */
export const NOMBRE_HUECO_FIRMA = '__firma';

/*
    Un hueco del formulario: se imprime con lo que haya y se puede completar en pantalla.

    El texto dibujado por pdfmake sólo reserva el ancho; lo que se ve termina siendo el
    campo, que lo tapa. Por eso el valor viaja también en la marca: el conversor lo necesita
    para dejarlo cargado y que el documento se lea igual sin tocar nada.
*/
export function campo(nombre:string, valor:unknown, largo = 30):Record<string, unknown>{
    const texto = valor == null ? '' : String(valor).trim();
    return {
        text:dato(texto, largo),
        bold:true,
        link:`${PREFIJO_CAMPO}${encodeURIComponent(nombre)}|${encodeURIComponent(texto)}`,
    };
}

/** Deshace lo que arma campo(): nombre y valor inicial de un hueco. */
export function partesDeMarca(uri:string):{nombre:string, valor:string}|null{
    if(!uri.startsWith(PREFIJO_CAMPO)){
        return null;
    }
    const resto = uri.slice(PREFIJO_CAMPO.length);
    const corte = resto.indexOf('|');
    const crudoNombre = corte < 0 ? resto : resto.slice(0, corte);
    const crudoValor = corte < 0 ? '' : resto.slice(corte + 1);
    try{
        return {nombre:decodeURIComponent(crudoNombre), valor:decodeURIComponent(crudoValor)};
    }catch(_err){
        // Una marca ilegible no debería voltear la emisión del documento.
        return {nombre:crudoNombre, valor:''};
    }
}

const COLUMNAS_ITEMS = [
    {titulo:'FICHA'      , campo:'ficha'    , ancho:52},
    {titulo:'ESTANTE'    , campo:'tipo_bien', ancho:58},
    {titulo:'DESCRIPCIÓN', campo:'detalle'  , ancho:'*' as const},
    {titulo:'MARCA'      , campo:'marca'    , ancho:70},
    {titulo:'MODELO'     , campo:'modelo'   , ancho:70},
    {titulo:'SERIE'      , campo:'serie'    , ancho:76},
    {titulo:'IMEI'       , campo:'imei'     , ancho:82},
];

function textoItem(valor:unknown):string{
    const texto = valor == null ? '' : String(valor).trim();
    return texto === '' ? '' : texto;
}

export function ordenarItems(items:ItemDocumento[]):ItemDocumento[]{
    return [...items].sort((a, b) =>
        String(a.ficha).localeCompare(String(b.ficha), 'es', {numeric:true})
    );
}

/** La tabla de ítems es la misma en los dos formularios. */
export function tablaDeItems(items:ItemDocumento[]):Record<string, any>{
    return {
        table:{
            headerRows:1,
            dontBreakRows:true,
            widths:COLUMNAS_ITEMS.map(c => c.ancho),
            body:[
                COLUMNAS_ITEMS.map(c => ({text:c.titulo, style:'encabezadoTabla'})),
                ...items.map(item =>
                    COLUMNAS_ITEMS.map(c => textoItem((item as any)[c.campo]))
                ),
            ],
        },
        layout:{
            hLineWidth:(i:number, node:any) =>
                i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.3,
            vLineWidth:() => 0.3,
            hLineColor:() => '#999999',
            vLineColor:() => '#cccccc',
        },
        margin:[0, 8, 0, 8],
    };
}

/**
 * Código corto del contenido, para cotejar un papel contra el sistema. Es el hash de lo
 * declarado, no del archivo: el hash del PDF no puede imprimirse dentro del propio PDF.
 */
export function calcularCodigoContenido(
    tipo:TipoDocumentoSolicitud,
    cabecera:CabeceraDocumento,
    items:ItemDocumento[],
    version:number,
):string{
    const filas = ordenarItems(items).map(item => COLUMNAS_ITEMS
        .map(c => textoItem((item as any)[c.campo]))
        .join('|'));
    const canonico = [
        `tipo:${tipo}`,
        `acta:${cabecera.acta}`,
        `version:${version}`,
        // La operación entra al código: una entrega y una devolución de los mismos bienes
        // son papeles distintos y no pueden cotejar igual.
        `operacion:${tipo === 'acta' ? operacionDeActa(cabecera.operacion) : ''}`,
        `persona:${cabecera.persona.nombre ?? ''}`,
        `items:${filas.length}`,
        ...filas,
    ].join('\n');
    return createHash('sha256').update(canonico, 'utf8').digest('hex')
        .slice(0, 16).toUpperCase();
}

/* ── Cláusulas del comodato, textuales del formulario F-SA-12 Rev. 7 ────────────── */

const CLAUSULAS:{titulo:string, texto:string}[] = [
    {titulo:'SEGUNDA', texto:'EL COMODATARIO destinará el bien que se detalla en la cláusula precedente, para la realización de las tareas que le fueran encomendadas (operativos, trabajo remoto, etc.) La entrega del bien implica única y exclusivamente la facultad de uso sobre el mismo, el que deberá realizarse conforme a su destino.'},
    {titulo:'TERCERA', texto:'Se encuentra prohibida la transferencia y/o cesión, parcial o total, transitoria o permanente, gratuita u onerosa y por cualquier título a terceras personas del presente comodato, como así también se encuentra vedado el cambio del destino indicado. En caso de violación de alguna o todas las obligaciones mencionadas en esta cláusula por parte del COMODATARIO, el COMODANTE podrá exigir la restitución inmediata del bien, sin necesidad de interpelación judicial o extrajudicial previa.'},
    {titulo:'CUARTA', texto:'EL COMODATARIO reconoce en forma expresa que recibe el bien objeto del presente contrato de parte del IDECBA gratuitamente, en concepto de préstamo de uso.'},
    {titulo:'QUINTA', texto:'El presente comodato tendrá vigencia hasta el 31 de diciembre del corriente año y se renovará de forma automática siempre que el COMODATARIO continúe con la situación de revista. En el supuesto que no continúe dicha situación sea por la finalización del contrato de locación de servicios o por la extinción de la relación de empleo público, deberá proceder a la devolución del bien dentro de las 48 horas, de producida la misma, en la sede del IDECBA.'},
    {titulo:'SEXTA', texto:'EL COMODATARIO podrá rescindir en cualquier momento el presente contrato previa notificación a este Instituto de Estadística y Censos debiendo para ello restituir el bien objeto del presente al IDECBA en buen estado de conservación.'},
    {titulo:'SÉPTIMA', texto:'El IDECBA podrá requerir en cualquier momento la devolución del bien objeto de la presente, y EL COMODATARIO deberá efectuar la entrega del mismo dentro de los DOS (2) días hábiles posteriores a la notificación. En ningún supuesto y bajo ningún concepto podrá EL COMODATARIO retener el bien prestado, una vez que el IDECBA solicite su reintegro. En caso de no restitución del bien en el plazo acordado, EL COMODATARIO quedará constituido en mora de pleno derecho, quedando facultado el IDECBA a homologar el presente convenio y solicitar judicialmente su reintegro con la sola presentación del mismo.'},
    {titulo:'OCTAVA', texto:'EL COMODATARIO se compromete a mantener en buen estado de conservación y a utilizar el bien recibido conforme su destino; así como a resguardar el bien entregado y no comercializarlo. En caso de robo o hurto del bien objeto del presente, EL COMODATARIO deberá comunicarse dentro de las veinticuatro (24) horas de acaecido el hecho, con su superior y con el Departamento Técnico Legal dependiente de la Dirección Legal Técnica y de Recursos Humanos del IDECBA, previo a realizar cualquier tipo de denuncia, a fin de ser instruido en el procedimiento que corresponda. El IDECBA podrá, ante la comunicación falsa o ausencia de la misma, iniciar las acciones que pudieren corresponder.'},
    {titulo:'NOVENA', texto:'EL COMODATARIO deberá solicitar oportunamente al IDECBA por cuenta de éste último, las reparaciones necesarias sobre el bien objeto del presente, con el fin de posibilitar una adecuada utilización del mismo.'},
    {titulo:'DECIMA', texto:'El IDECBA y EL COMODATARIO constituyen domicilio especial en los señalados “ut supra”, donde tendrán validez todas las notificaciones judiciales y extrajudiciales.'},
    {titulo:'DECIMOPRIMERA', texto:'Para cualquier cuestión judicial, de común acuerdo las partes quedan sometidas a la competencia de los Juzgados Ordinarios de Primera Instancia con competencia en lo Contencioso Administrativo y Tributario de la Ciudad de Buenos Aires.'},
];

const ESTILOS = {
    codigo:{fontSize:7, color:'#666666'},
    organismo:{fontSize:9, bold:true},
    departamento:{fontSize:8, color:'#444444'},
    titulo:{fontSize:13, bold:true, alignment:'center' as const, margin:[0, 10, 0, 8]},
    clausula:{fontSize:8.5, alignment:'justify' as const, margin:[0, 0, 0, 6]},
    encabezadoTabla:{fontSize:8, bold:true, color:'#ffffff', fillColor:'#4a5568'},
    etiqueta:{fontSize:8, color:'#555555'},
    pie:{fontSize:7, color:'#666666'},
};

function encabezado(tipo:TipoDocumentoSolicitud, logo?:string|null):unknown{
    const identidad:unknown[] = [];
    if(logo){
        identidad.push({image:logo, width:140, margin:[0, 0, 10, 0]});
    }else{
        identidad.push({width:'*', stack:[
            {text:ORGANISMO, style:'organismo'},
        ]});
    }
    identidad.push({
        width:'auto',
        alignment:'right',
        text:CODIGO_FORMULARIO[tipo],
        style:'codigo',
    });
    return {columns:identidad, margin:[0, 0, 0, 4]};
}

/*
    Bloque de firma.

    La línea de la firma va marcada como los demás huecos, pero con un nombre reservado: en
    vez de convertirse en un campo de texto, sirve para saber dónde apoyar el campo de firma
    digital. Antes ese campo iba en coordenadas fijas heredadas de la declaración y caía
    contra el pie de página, a 170 puntos de la línea que dice "Firma".

    La aclaración queda como línea a completar a mano: la firma digital ya identifica a
    quien firma.
*/
function bloqueFirma(etiqueta:string):unknown{
    return {
        margin:[0, 18, 0, 0],
        unbreakable:true,
        stack:[
            {text:etiqueta, style:'etiqueta', margin:[0, 0, 0, 4]},
            {columns:[
                {width:'*', stack:[
                    {
                        text:'_'.repeat(38),
                        style:'pie',
                        link:`${PREFIJO_CAMPO}${NOMBRE_HUECO_FIRMA}|`,
                    },
                    {text:'Firma', style:'etiqueta', margin:[0, 2, 0, 0]},
                ]},
                {width:'*', stack:[
                    {text:'_'.repeat(38), style:'pie'},
                    {text:'Aclaración', style:'etiqueta', margin:[0, 2, 0, 0]},
                ]},
            ], columnGap:24},
        ],
    };
}

function contenidoComodato(params:DocumentoParams):unknown[]{
    const {cabecera} = params;
    const p = cabecera.persona;
    return [
        {text:DEPARTAMENTO, style:'departamento'},
        {text:TITULO_DOCUMENTO.comodato, style:'titulo'},
        {
            style:'clausula',
            text:[
                'Entre el ', ORGANISMO, ', en adelante “IDECBA”, representada en este acto por ',
                campo('representante', cabecera.representante, 34),
                ' en su carácter de ',
                campo('caracter_representante', cabecera.caracterRepresentante, 22),
                ' de dicha repartición y por la otra el/la señor/a ',
                campo('comodatario', p.nombre, 34),
                ' con DNI ', campo('dni', p.dni, 16),
                ' con domicilio en la calle ', campo('domicilio', p.domicilio, 34),
                ' por sí, en su carácter de ', campo('caracter', p.caracter, 24),
                ', situación de revista: ', campo('situacion_revista', p.situacionRevista, 24),
                ' mail: ', campo('mail', p.mail, 28),
                ', teléfono: ', campo('telefono', p.telefono, 18),
                ' en adelante “EL COMODATARIO” convienen en celebrar el presente COMODATO'
                + ' sujeto a las siguientes cláusulas y condiciones:',
            ],
        },
        {
            style:'clausula',
            text:[
                {text:'PRIMERA: ', bold:true},
                'El IDECBA da en préstamo de uso al COMODATARIO, y éste/a acepta, un/a:',
            ],
        },
        tablaDeItems(ordenarItems(params.items)),
        ...CLAUSULAS.map(c => ({
            style:'clausula',
            text:[{text:`${c.titulo}: `, bold:true}, c.texto, ' -'],
        })),
        {
            style:'clausula',
            margin:[0, 6, 0, 0],
            text:'En prueba de conformidad se firman DOS (2) ejemplares de un mismo tenor y a un'
                + ' solo efecto, por el IDECBA y por EL COMODATARIO en la Ciudad Autónoma de'
                + ` Buenos Aires, ${fechaEnLetras(cabecera.fecha)}.`,
        },
        bloqueFirma('EL COMODATARIO'),
    ];
}

function contenidoActa(params:DocumentoParams):unknown[]{
    const {cabecera} = params;
    const items = ordenarItems(params.items);
    return [
        {text:ORGANISMO, style:'departamento'},
        {text:tituloDocumento('acta', cabecera), style:'titulo'},
        {
            columns:[
                {width:'*', text:[{text:'Fecha: ', style:'etiqueta'}, fechaCorta(cabecera.fecha)]},
                {width:'auto', text:[{text:'Acta N°: ', style:'etiqueta'}, {text:cabecera.acta, bold:true}]},
            ],
            margin:[0, 0, 0, 10],
        },
        {
            style:'clausula',
            text:[
                'En este acto ', campo('entrega', cabecera.representante, 30),
                ' en representación de la / del ', campo('entrega_representa', cabecera.entregaRepresenta, 28),
                ' y por la otra parte ', campo('recibe', cabecera.persona.nombre, 30),
                ' en representación de la / del ', campo('recibe_representa', cabecera.recibeRepresenta, 28),
                ' en su carácter de ', campo('caracter', cabecera.persona.caracter, 24),
                ' de la/ del misma/o, ',
                {text:TEXTO_OPERACION[operacionDeActa(cabecera.operacion)].frase, bold:true},
                ' ', {text:String(items.length), bold:true},
                ' bien(es), de acuerdo al siguiente detalle:',
            ],
        },
        tablaDeItems(items),
        bloqueFirma('Recibido por:'),
    ];
}

/** Definición del documento para pdfmake. Objeto plano: no genera el PDF. */
export function buildDocumentoSolicitud(params:DocumentoParams):Record<string, any>{
    const {tipo, cabecera, emision, logo} = params;
    const items = ordenarItems(params.items);
    const codigo = calcularCodigoContenido(tipo, cabecera, items, emision.version);
    return {
        pageSize:'A4',
        pageOrientation:tipo === 'acta' ? 'landscape' : 'portrait',
        pageMargins:[36, 36, 36, 48],
        info:{
            title:`${tituloDocumento(tipo, cabecera)} - acta ${cabecera.acta} (v${emision.version})`,
            author:`Sistema de inventario - ${ORGANISMO}`,
            subject:`Solicitud ${cabecera.acta}`,
        },
        defaultStyle:{font:'Roboto', fontSize:8.5},
        styles:ESTILOS,
        content:[
            encabezado(tipo, logo),
            ...(tipo === 'comodato' ? contenidoComodato(params) : contenidoActa(params)),
        ],
        footer:(currentPage:number, pageCount:number) => ({
            margin:[36, 8, 36, 0],
            columns:[
                {
                    width:'*',
                    style:'pie',
                    text:`${CODIGO_FORMULARIO[tipo]} · acta ${cabecera.acta}`
                        + ` · versión ${emision.version} · código ${codigo}`,
                },
                {width:'auto', style:'pie', alignment:'right', text:`Página ${currentPage} de ${pageCount}`},
            ],
        }),
    };
}

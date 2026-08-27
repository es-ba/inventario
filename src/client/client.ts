import {html} from "js-to-html";
import * as likeAr from "like-ar";
import "dialog-promise";
import { DireccionAccion, EstadoAccion } from "../common/contracts";

var my = myOwn;

// const baseUrl = "/inventario";

myOwn.clientSides.verIconoSvg={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        let td = depot.rowControls[fieldName];
        td.innerHTML='';
        if(depot.row.path_icono_svg){
            var svg = html.svg({
                class:"svg-acciones"
            },[
                html.path({
                    d:depot.row.path_icono_svg
                })
            ]).create();
            svg.setAttribute("viewBox","0 0 50 50");
            td.appendChild(svg);
        }
    }
};

var crearSVG = (path:string,props:any) => {
    var svg = html.svg(props || {},[
        html.path({
            d:path
        })
    ]).create();
    svg.setAttribute("viewBox","0 0 50 50");
    return svg
}

var crearBotonAccion = (depot:myOwn.Depot, action:EstadoAccion)=>{
    let  accionSinGuiones = action.eaccion.replace('_',' ');
    var svg = crearSVG(action.path_icono_svg,{class:"svg-acciones"})
    if(action.desactiva_boton){
        return html.span({class:`sin-boton-accion`},[accionSinGuiones, svg as unknown as HTMLElement]).create()
    }
    let button = html.button({
        class:`boton-accion boton-accion-${action.eaccion_direccion}`
    },[
        `${accionSinGuiones}`,
        //@ts-ignore svg es htmlelement
        action.path_icono_svg?svg:null,
    ]).create();
    button.onclick = ()=> {
        var actionFun = async ()=>{
            button.disabled=true;
            try{
                await my.ajax.accion_solicitud_ejecutar({
                    acta: depot.row.acta,
                    accion: action.eaccion
                });
                var grid=depot.manager;
                // @ts-ignore
                grid.retrieveRowAndRefresh(depot,{retrieveIgnoringWhere:true})                        
                // if(action.nombre_wscreen){
                //     //TODO acomodar esto en algun momento
                //     let params = depot.row;
                //     var up = {
                //         operativo:params.operativo,
                //         tarea:params.tarea,
                //         enc: Number(params.enc)
                //     }
                //     abrirEncuestaEnPestanniaDedicada(location.origin+location.pathname+my.menuSeparator+`w=${action.nombre_wscreen}&up=${JSON.stringify(up)}&autoproced=true`)
                // }
            }catch(err){
                // @ts-ignore
                alertPromise(err.message)
                throw err
            }finally{
                //retraso la habilitación porque a veces tarda en redibujarse la botonera y puede traer problemas si dan doble click 
                //ya que ejecuta nuevamente una acción que ya se ejecutó (y terminó) antes
                setTimeout(()=>button.disabled=false,3000)
            }
        }
        
        var confirmPromiseOpts: DialogOptions = {}
        if(action.confirma){
            confirmPromiseOpts.askForNoRepeat = 'no volver a mostrar'; //muestra mensaje por default pero anda igual
            var buttonsDef = [
                {label:'sí', value:true},
                {label:'no', value:false}
            ]
            confirmPromise(`confirma acción "${accionSinGuiones}"?`, {...confirmPromiseOpts, buttonsDef}).then(actionFun);
        }else{
            actionFun();
        }
    }
    return button
}

var crearBotonesAcciones = async (opts:{depot:myOwn.Depot, fieldName:string, direccion: DireccionAccion})=>{
    let {depot,fieldName,direccion} = opts;
    let td = depot.rowControls[fieldName];
    td.innerHTML='';
    (depot.rowControls.acciones.getTypedValue()||[])
        .filter((action:EstadoAccion)=>action.eaccion_direccion==direccion)
        .forEach((action:EstadoAccion)=>td.appendChild(crearBotonAccion(depot, action)));
}

myOwn.clientSides.accionesAvance={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        crearBotonesAcciones({depot,fieldName,direccion:'avance'});
    }
};

myOwn.clientSides.accionesRetroceso={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        crearBotonesAcciones({depot,fieldName,direccion:'retroceso'});
    }
};

const getSubirAdjuntoBienPathAndParams = (depot:myOwn.Depot) =>
    ({
        ajaxPath: 'archivo_subir',
        params: {
            ficha: depot.row.ficha,
        }
    });

myOwn.clientSides.subirAdjunto = {
    prepare: function(depot:myOwn.Depot, fieldName:string){
        const botonSubir = html.button('archivo').create();
        depot.rowControls[fieldName].appendChild(botonSubir);
        if (depot.row.ficha == null) botonSubir.disabled = true;
        botonSubir.addEventListener('click', async function(){
            const showWithMiniMenu = false;
            const messages = {
                importDataFromFile: 'Seleccione un archivo',
                import: 'Cargar'
            };
            const {ajaxPath, params} = getSubirAdjuntoBienPathAndParams(depot);
            my.dialogUpload(
                [ajaxPath],
                params,
                function(result:{nombre:string, message:string, row:Record<string,string>}){
                    depot.rowControls.archivo.setTypedValue(result.nombre);
                    const grid = depot.manager;
                    grid.depotRefresh(depot, result.row);
                    return result.message;
                },
                showWithMiniMenu,
                messages
            );
        });
        // @ts-ignore
        depot.botonSubirAdjunto = botonSubir;
    },
    update: function(depot:myOwn.Depot){
        const grid = depot.manager;
        // @ts-ignore
        const botonSubir:HTMLButtonElement = depot.botonSubirAdjunto;
        botonSubir.disabled = depot.row.ficha == null;
        likeAr(depot.rowControls).forEach((control, _i)=>{
            control.onpaste = async function(e:ClipboardEvent){
                if (e.clipboardData) {
                    const items = e.clipboardData.items;
                    if (!items) return;
                    let is_image = false;
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf("image") !== -1) {
                            const blob = items[i].getAsFile()!;
                            if(depot.row.archivo){
                                await confirmPromise("el adjunto ya contiene un archivo, ¿desea reemplazarlo?");
                            }
                            const {ajaxPath, params} = getSubirAdjuntoBienPathAndParams(depot);
                            const newFile = new File([blob], `pasted-${params.ficha}.${blob.name.split('.').pop()}`, {type: blob.type});
                            is_image = true;
                            const {row} = await my.ajax[ajaxPath]({
                                ...params,
                                files: [newFile]
                            });
                            grid.depotRefresh(depot, {updatedRow:row, sendedForUpdate:{}}, {noDispatchEvents:true});
                        }
                    }
                    if(is_image == true){
                        e.preventDefault();
                    }
                }
            };
        });
    }
};

type AccionDeclaracion = {
    nombre:string,
    estados:string[],
    ayuda:string,
    direccion:'avance'|'retroceso',
    ejecutar:(declaracion:any, refrescar:()=>void)=>Promise<string|null>,
};

// confirmPromise rechaza cuando el usuario cancela o elige el botón false
const confirmarDeclaracion = async (mensaje:string, etiqueta:string):Promise<boolean> => {
    try{
        await confirmPromise(mensaje, {buttonsDef:[
            {label:etiqueta, value:true},
            {label:'cancelar', value:false}
        ]});
        return true;
    }catch(_cancelado){
        return false;
    }
};

const ACCIONES_DECLARACION:AccionDeclaracion[] = [
    {
        nombre:'emitir',
        estados:['BORRADOR'],
        ayuda:'Genera el PDF y congela la lista de bienes',
        direccion:'avance',
        ejecutar: async (declaracion) => {
            const confirmado = await confirmarDeclaracion(
                `¿Emitir la declaración ${declaracion}?`
                + ` Se genera el PDF y la lista de bienes queda bloqueada`
                + ` hasta que la declaración se observe.`,
                'emitir'
            );
            if(!confirmado){
                return null;
            }
            const result = await my.ajax.declaracion_emitir({declaracion});
            return result.message;
        },
    },
    {
        nombre:'subir firmado',
        estados:['EMITIDA'],
        ayuda:'Carga el PDF con la firma digital del responsable',
        direccion:'avance',
        ejecutar: async (declaracion, refrescar) => {
            my.dialogUpload(
                ['declaracion_firmada_subir'],
                {declaracion},
                function(result:{message:string}){
                    refrescar();
                    return result.message;
                },
                false,
                {
                    importDataFromFile:'Seleccione el PDF firmado digitalmente',
                    import:'Cargar'
                }
            );
            return null;
        },
    },
    {
        nombre:'observar',
        estados:['EMITIDA', 'FIRMADA'],
        ayuda:'Marca la declaración como observada para poder corregirla',
        direccion:'retroceso',
        ejecutar: async (declaracion) => {
            // @ts-ignore promptPromise es global de dialog-promise
            const motivo = await promptPromise(
                `Motivo de la observación de la declaración ${declaracion}:`
            );
            if(motivo == null || String(motivo).trim() === ''){
                return null;
            }
            const result = await my.ajax.declaracion_observar({declaracion, motivo});
            return result.message;
        },
    },
    {
        nombre:'reabrir',
        estados:['OBSERVADA'],
        ayuda:'Vuelve a BORRADOR para corregir la lista y emitir una versión nueva',
        direccion:'avance',
        ejecutar: async (declaracion) => {
            const confirmado = await confirmarDeclaracion(
                `¿Reabrir la declaración ${declaracion}?`
                + ` Vuelve a BORRADOR y la lista de bienes se puede editar otra vez.`,
                'reabrir'
            );
            if(!confirmado){
                return null;
            }
            const result = await my.ajax.declaracion_reabrir({declaracion});
            return result.message;
        },
    },
];

var crearBotonDeclaracion = (depot:myOwn.Depot, accion:AccionDeclaracion) => {
    const boton = html.button(accion.nombre).create();
    boton.className = `boton-accion boton-accion-${accion.direccion}`;
    boton.title = accion.ayuda;
    boton.onclick = async () => {
        const declaracion = depot.row.declaracion;
        if(declaracion == null){
            return;
        }
        boton.disabled = true;
        try{
            const refrescar = () => {
                const grid = depot.manager;
                // @ts-ignore retrieveRowAndRefresh no está en los tipos
                grid.retrieveRowAndRefresh(depot, {retrieveIgnoringWhere:true});
            };
            const mensaje = await accion.ejecutar(declaracion, refrescar);
            if(mensaje != null){
                refrescar();
                // @ts-ignore alertPromise es global de dialog-promise
                await alertPromise(mensaje);
            }
        }catch(err){
            // @ts-ignore
            await alertPromise(err.message);
        }finally{
            // el redibujado de la fila puede demorar; se evita el doble click
            setTimeout(() => { boton.disabled = false; }, 1500);
        }
    };
    return boton;
};

myOwn.clientSides.accionesDeclaracion = {
    prepare:function(_depot:myOwn.Depot, _fieldName:string):void{
    },
    update:function(depot:myOwn.Depot, fieldName:string):void{
        const td = depot.rowControls[fieldName];
        td.innerHTML = '';
        if(depot.row.declaracion == null){
            td.appendChild(html.span({class:'sin-boton-accion'}, 'grabar primero').create());
            return;
        }
        const estado = depot.row.estado;
        ACCIONES_DECLARACION
            .filter(accion => accion.estados.indexOf(estado) >= 0)
            .forEach(accion => td.appendChild(crearBotonDeclaracion(depot, accion)));
    }
};

myOwn.clientSides.bajarDocumentoDeclaracion = {
    prepare:function(_depot:myOwn.Depot, _fieldName:string):void{
    },
    update:function(depot:myOwn.Depot, fieldName:string):void{
        const td = depot.rowControls[fieldName];
        td.innerHTML = '';
        if(depot.row.archivo){
            const fileParts = depot.row.archivo.split('/');
            const fileName = fileParts.pop();
            if(fileName){
                td.appendChild(html.a({
                    class:'link-descarga-archivo',
                    href:`download/declaracion_documento?declaracion=${depot.row.declaracion}`
                        +`&version=${depot.row.version}&tipo=${depot.row.tipo}`,
                    download: fileName
                }, "documento").create());
            }
        }
    }
};

myOwn.clientSides.bajarAdjunto = {
    prepare:function(_depot:myOwn.Depot, _fieldName:string):void{
    },
    update:function(depot:myOwn.Depot, fieldName:string):void{
        const td = depot.rowControls[fieldName];
        td.innerHTML = '';
        if(depot.row.archivo){
            const fileParts = depot.row.archivo.split('/');
            const fileName = fileParts.pop();
            if(fileName){
                td.appendChild(html.a({
                    class:'link-descarga-archivo',
                    href:`download/adjunto_bien?ficha=${depot.row.ficha}&numero_adjunto=${depot.row.numero_adjunto}`,
                    download: fileName
                }, "archivo").create());
            }
        }
    }
};

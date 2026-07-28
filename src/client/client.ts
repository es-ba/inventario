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

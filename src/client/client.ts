import {html} from "js-to-html";
import { DireccionAccion, EstadoAccion } from "../common/contracts";

var my = myOwn;

// const baseUrl = "/inventario";

my.wScreens.prueba=async function(){
    // history.replaceState(null, '', `${location.origin+location.pathname}/../react`);
    // location.reload();
    let layout = document.getElementById('main_layout')!;
    layout.innerHTML = '';
    layout.appendChild(
    html.div({class:'prueba-screen'}, 'Pantalla de prueba del inventario').create()
    )
}

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

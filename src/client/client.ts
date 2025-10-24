
import {html} from "js-to-html";
import * as likeAr from "like-ar";
import "dialog-promise";
"use strict";
declare const myOwn: any;
const my = myOwn;
// Helpers
const getSubirArchivoPathAndParams = (depot: myOwn.Depot) => ({
  ajaxPath: "adjuntar",
  params: {
    ficha: depot.row.ficha,
    orden: depot.row.orden
  }
});
myOwn.clientSides.subirAdjunto = {
  prepare: function(depot: myOwn.Depot, fieldName: string){
    const botonCargar = html.button('archivo').create();  
    botonCargar.type = 'button';
            if (depot.row.archivo == null && depot.row.anotacion !== 0) {
            depot.rowControls[fieldName].appendChild(botonCargar);
            if (depot.row.ficha == null) botonCargar.disabled = true;
            botonCargar.addEventListener('click', async function(){
                const showWithMiniMenu = false;
                const messages = {
                    importDataFromFile: 'Seleccione un archivo',
                    import: 'Cargar'
                };
                const {ajaxPath, params} = getSubirArchivoPathAndParams(depot);
                my.dialogUpload(
                    [ajaxPath],
                    params,
                    function(result:{nombre: string, message:string, row:Record<string, string>}){
                        depot.rowControls.archivo.setTypedValue(result.nombre);
                        botonCargar.disabled = false;
                        const grid = depot.manager;
                        grid.depotRefresh(depot,result.row);
                        return result.message;
                    },
                    showWithMiniMenu,
                    messages
                )
            });
        }
            depot.row.botonCargar = botonCargar;
  },
      update: function(depot:myOwn.Depot){
        const grid = depot.manager;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const botonCargar:HTMLButtonElement = depot.botonCargar;
        //botonCargar.disabled = depot.row. != null || depot.row.ficha == null;
        likeAr(depot.rowControls).forEach((control, _i)=>{
            control.onpaste = async function(e:ClipboardEvent){
                if (e.clipboardData) {
                    const items = e.clipboardData.items;
                    if (!items) return;
                    //access data directly
                    let is_image = false;
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf("image") !== -1) {
                            //image
                            const blob = items[i].getAsFile()!;
                            let myImageDepot = depot;
                            let promiseChain = Promise.resolve();
                            if(depot.row.archivo){
                                promiseChain = promiseChain.then(async ()=>{
                                    await confirmPromise("la anotación ya contiene un adjunto, desea crear una nueva?")
                                    myImageDepot=grid.createRowInsertElements(null,depot);
                                    return
                                })
                            }
                            await promiseChain;
                            const {ajaxPath, params} = getSubirArchivoPathAndParams(myImageDepot);
                            const newFile = new File([blob], `pasted-${params.ficha || '$$ficha'}.${blob.name.split('.').pop()}`, {type: blob.type});
                            is_image = true;
                            const {row} = await my.ajax[ajaxPath]({
                                ...params,
                                ficha: params.ficha || null,
                                files: [newFile]
                            })
                            grid.depotRefresh(myImageDepot,{updatedRow:row, sendedForUpdate:{}},{noDispatchEvents:true});
                        }
                    }
                    if(is_image == true){
                        e.preventDefault();
                    }
                }
            }
        })
    }
};
my.wScreens.prueba=async function(){
    // history.replaceState(null, '', `${location.origin+location.pathname}/../react`);
    // location.reload();
    let layout = document.getElementById('main_layout')!;
    layout.innerHTML = '';
    layout.appendChild(
        html.div({class:'prueba-screen'}, 'Pantalla de prueba del inventario').create()
    )
}

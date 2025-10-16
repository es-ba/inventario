import {html} from "js-to-html";
import * as likeAr from "like-ar";
import "dialog-promise";


"use strict";

declare const myOwn: any;
const my = myOwn;



// Helpers
const getSubirArchivoPathAndParams = (depot: myOwn.Depot) => {
  const controls = depot.rowControls ?? {};
  const ficha = depot.row.ficha ?? controls.ficha?.getTypedValue?.();
  const orden = depot.row.orden ?? controls.orden?.getTypedValue?.();
  const missingFicha = ficha == null || ficha === '';
  const missingOrden = orden == null || orden === '';
  return {
    ajaxPath: "adjuntar",
    params: { ficha, orden },
    missingFicha,
    missingOrden
  };
};

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
                const uploadInfo = getSubirArchivoPathAndParams(depot);
                if (uploadInfo.missingFicha) {
                    await alertPromise('Primero guarda o completa la ficha del movimiento antes de adjuntar un archivo.');
                    return;
                }
                if (uploadInfo.missingOrden) {
                    await alertPromise('Guarda el movimiento para obtener el numero de orden antes de subir un archivo.');
                    return;
                }
                const {ajaxPath, params} = uploadInfo;
                my.dialogUpload(
                    ajaxPath,
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
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{
                                promiseChain = promiseChain.then(async ()=>{

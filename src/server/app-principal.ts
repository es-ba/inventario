"use strict";

import { AppBackend, Context, Request, 
    ClientModuleDefinition, OptsClientPage, MenuDefinition, MenuInfoBase
} from "./types-principal";

// import * as MiniTools from 'mini-tools';

import {ProceduresInventario} from "./procedures-principal";
import { roles } from "./table-roles";
import { bienes } from './table-bienes';
import { usuarios   } from './table-usuarios';
import { grupos } from './table-grupos';
import { historial } from "./table-historial";
import { tipo_espacio } from "./table-tipo_espacio";
import { espacios } from "./table-espacios";
import { ordenes_compra } from "./table-ordenes_compra";
import { rubros } from "./table-rubros";
import { responsables } from "./table-responsables";
import { sedes } from "./table-sedes";
import { tipo_bien } from "./table-tipo_bien";
import { tipo_area } from "./table-tipo_area";
import { areas } from './table-areas';
import { categoria_bien } from "./table-categoria_bien";
import { estados_baja } from "./table-estados_baja";
import { estados } from "./table-estados";
import { marcas } from "./table-marcas";
import { modalidad_uso } from "./table-modalidad_uso";
import { motivos_baja } from "./table-motivos_baja";
import { tipo_contrato } from "./table-tipo_contrato";
import { cuentas } from "./table-cuentas";
import { clases } from "./table-clases";
import { movimientos_bien } from "./table-movimientos_bien";
import { tipo_asignacion } from "./table-tipo_asignacion";

import {staticConfigYaml} from './def-config';
import { tipo_ordencompra } from "./table-tipo_ordencompra";
import { estado_ordencompra } from "./table-estado_ordencompra";
import { proveedores } from "./table-proveedores";
// import * as express from "express";

export class AppInventario extends AppBackend{
    constructor(){
        super();
    }
    override async postConfig(){
        await super.postConfig();
    }
    override configStaticConfig(){
        super.configStaticConfig();
        this.setStaticConfig(staticConfigYaml);
    }
    // override addUnloggedServices(mainApp:ExpressPlus, baseUrl:string){
    //     var be=this;
    //     if(baseUrl=='/'){
    //         baseUrl='';
    //     }   
    //     mainApp.get(baseUrl+'/bienes.js',async function(req,res,_next){
    //         var bienes = await be.inDbClient(req as Request, async function(client){
    //             var result = await client.query(`
    //                 SELECT ficha, integrado, observacion
    //                     FROM bienes
    //                     ORDER BY fecha DESC
    //             `).fetchAll();
    //             console.log(result);
    //             return result.rows;
    //         });
    //         console.log(bienes);
    //         var bienes_js = 'var bienes = '+JSON.stringify(bienes);
    //         console.log(bienes_js);
    //         MiniTools.serveText(bienes_js,'text/javascript')(req, res);
    //     });
    //     super.addUnloggedServices(mainApp, baseUrl);
    // }
    override async getProcedures(){
        var be = this;
        return [
            ...await super.getProcedures(),
            ...ProceduresInventario
        ].map(be.procedureDefCompleter, be);
    }
    override getMenu(context:Context):MenuDefinition{
        var menuContent:MenuInfoBase[]=[
            {menuType:'prueba', name:'prueba', label:'principal'},
            {menuType:'menu', name:'inventario', label:'inventario',  menuContent:[
                {menuType:'table', name:'bienes', label:'bienes', selectedByDefault:true},
                {menuType:'table', name:'areas', label:'areas'},
                {menuType:'table', name:'responsables' },
                {menuType:'table', name:'grupos', label:'grupos'},
            ]},
            {menuType:'menu', name:'ver', label:'ver',  menuContent:[
                { menuType: 'table', name: 'bienes_activos', table: 'bienes', ff: { estado: 'alta' }  },
                { menuType: 'table', name: 'bienes_inactivos', table: 'bienes', ff: { estado: 'desuso' } },
            ]},
        ];
        if(context.user && context.user.rol=="admin"){
            menuContent.push(
                {menuType:'menu', name:'config', label:'configurar', menuContent:[
                    {menuType:'table', name:'usuarios'  },
                    {menuType:'menu', name:'referenciales', label:'referenciales', menuContent:[
                        {menuType:'table', name:'tipo_bien' },
                        {menuType:'table', name:'tipo_area' },
                        {menuType:'table', name:'categoria_bien' },
                        {menuType:'table', name:'estados_baja' },
                        {menuType:'table', name:'estados' },
                        {menuType:'table', name:'modalidad_uso' },
                        {menuType:'table', name:'motivos_baja' },
                        {menuType:'table', name:'tipo_contrato' },
                        {menuType:'table', name:'sedes' },
                        {menuType:'table', name:'grupos' },
                        {menuType:'table', name:'tipo_espacio' },
                        {menuType:'table', name:'espacios' },
                        {menuType:'table', name:'rubros' },
                        {menuType:'table', name:'marcas' },
                        {menuType:'table', name:'tipo_ordencompra' },
                        {menuType:'table', name:'estado_ordencompra' },
                        {menuType:'table', name:'proveedores' },
                        {menuType:'table', name:'roles' },


                    ]},
                ]}
            )
        };
        return {menu:menuContent};
    }
    override clientIncludes(req:Request|null, opts:OptsClientPage):ClientModuleDefinition[]{
        var menuedResources:ClientModuleDefinition[]=req && opts && !opts.skipMenu ? [
            {type:'js' , src:'client/client.js' },
        ]:[
            {type:'js' , src:'unlogged.js' },
            
        ];
        var list: ClientModuleDefinition[] = [
            ...super.clientIncludes(req, opts),
            //{ type: 'css', file: 'inventario.css' },
            { type: 'css', file: 'menu.css' },
            ... menuedResources
        ] satisfies ClientModuleDefinition[];
        return list;
    }
    override prepareGetTables(){
        super.prepareGetTables();
        this.getTableDefinition={
            ... this.getTableDefinition,
            usuarios    ,
            categoria_bien,
            estados_baja,
            estados,
            movimientos_bien,
            tipo_asignacion,
            modalidad_uso,
            motivos_baja,
            tipo_contrato,
            responsables,
            sedes       ,
            roles       ,    
            tipo_area   ,
            areas       ,
            grupos      ,
            tipo_espacio,
            espacios    ,
            tipo_ordencompra,
            estado_ordencompra,
            ordenes_compra,
            cuentas     ,
            clases      ,
            rubros      ,
            marcas,
            tipo_bien   ,
            bienes      ,
            historial,
            proveedores            
         
  
        }
    }       
}

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
import { estados_bien } from "./table-estados_bien";
import { marcas } from "./table-marcas";
import { modalidad_uso } from "./table-modalidad_uso";
import { motivos_baja } from "./table-motivos_baja";
import { tipo_contrato } from "./table-tipo_contrato";
import { cuentas } from "./table-cuentas";
import { clases } from "./table-clases";
import { movimientos_bien } from "./table-movimientos_bien";
import { tipo_asignacion } from "./table-tipo_asignacion";
import { tipo_ordencompra } from "./table-tipo_ordencompra";
import { estado_ordencompra } from "./table-estado_ordencompra";
import { proveedores } from "./table-proveedores";
import { estados_movimiento } from "./table-estados_movimiento";
import { estado_bien_viejo } from "./table-estado_bien_viejo";
import { movimientos_solicitudes } from "./table-movimientos_solicitudes";
import { movimientos_solicitud_bien } from "./table-movimientos_solicitud_bien";
import { acciones } from "./table-acciones";
import { estados } from "./table-estados";
import { estados_acciones } from "./table-estados_acciones";
import { movimientos_solicitudes_acciones } from "./table-movimientos_solicitudes_acciones";
import { declaraciones } from "./table-declaraciones";
import { declaraciones_bienes } from "./table-declaraciones_bienes";
import { jerarquias } from "./table-jerarquias";

import {staticConfigYaml} from './def-config';

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

    completeContext(context:Context){
        var es = context.es ?? {} as Context["es"]
        es.admin = context.user && context.user.rol=="admin"
        es.superior = es.admin || context.user && context.user.rol=="superior"
        es.administrativo = es.superior || context.user && context.user.rol=="administrativo" 
        es.lectura = es.administrativo || context.user && context.user.rol=="lectura"
        context.es = es;
    }
    override getContextForDump():Context{
        var context = super.getContextForDump();
        this.completeContext(context);
        return context;
    }
    override getContext(req:Request):Context{
        var context = super.getContext(req);
        this.completeContext(context);
        return context;
    }

    override getMenu(context: Context): MenuDefinition {
        var menuContent: MenuInfoBase[] = [
            {menuType: 'menu', name: 'bienes' , label: 'inventario', menuContent: [
                {menuType: 'table', name: 'bienes', label: 'todos', selectedByDefault: true},
                {menuType: 'table', name: 'bienes_activos', table: 'bienes', label: 'bienes en alta', ff: {estado: 'ALTA'}},
                {menuType: 'table', name: 'bienes_inactivos', table: 'bienes', label: 'bienes en baja', ff: {estado: 'BAJA'}},
            ]},            
            {menuType: 'menu', name: 'operaciones', label: 'operaciones', menuContent: [
                {menuType: 'table', name: 'declaraciones', label: 'declaraciones'},
                {menuType: 'table', name: 'movimientos_solicitudes', label: 'solicitudes de movimiento'},
                {menuType: 'table', name: 'historial', label: 'historial de cambios'},
            ]},
    
            {menuType: 'menu', name: 'gestion', label: 'gestion de datos', menuContent: [
                {menuType: 'table', name: 'areas', label: 'áreas'},
                {menuType: 'table', name: 'responsables', label: 'responsables'},
                {menuType: 'table', name: 'espacios', label: 'espacios'},
                {menuType: 'table', name: 'ordenes_compra', label: 'ordenes de compra'},
                {menuType: 'table', name: 'proveedores', label: 'proveedores'},
                {menuType: 'table', name: 'marcas', label: 'marcas'},
                {menuType: 'table', name: 'grupos', label: 'grupos'},
                {menuType: 'table', name: 'sedes', label: 'sedes'},
            ]},
        ];
        
        if(context.user && context.es.administrativo){
            menuContent.push(
                {menuType: 'menu', name: 'configuracion', label: 'configuración', menuContent: [
                    {menuType: 'menu', name: 'referenciales', label: 'tablas referenciales', menuContent: [
                        {menuType: 'table', name: 'tipo_bien', label: 'tipos de bien'},
                        {menuType: 'table', name: 'categoria_bien', label: 'categorías de bien'},
                        {menuType: 'table', name: 'tipo_area', label: 'tipos de área'},
                        {menuType: 'table', name: 'tipo_espacio', label: 'tipos de espacio'},
                        {menuType: 'table', name: 'tipo_contrato', label: 'tipos de contrato'},
                        {menuType: 'table', name: 'tipo_ordencompra', label: 'tipos de OC'},
                        {menuType: 'table', name: 'tipo_asignacion', label: 'tipos de asignación'},
                        {menuType: 'table', name: 'marcas', label: 'marcas'},
                        {menuType: 'table', name: 'rubros', label: 'rubros'},
                        {menuType: 'table', name: 'rubros', label: 'rubros'},
                        {menuType: 'table', name: 'cuentas', label: 'cuentas contables'},
                        {menuType: 'table', name: 'clases', label: 'clases'},
                        {menuType: 'table', name: 'jerarquias', label: 'jerarquías'},                   
                    ]},
                      {menuType: 'menu', name: 'definiciones_estados', label: 'estados y flujos', menuContent: [
                          {menuType: 'table', name: 'estados_bien', label: 'estados del bien'},
                          {menuType: 'table', name: 'estado_ordencompra', label: 'estados de OC'},
                          {menuType: 'table', name: 'estados', label: 'estados de movimientos'},
                          {menuType: 'table', name: 'motivos_baja', label: 'motivos de baja'},
                          {menuType: 'table', name: 'estados_acciones', label: 'estados de acciones'},
                      ]},                    
                    {menuType: 'menu', name: 'sistema', label: 'sistema y seguridad', menuContent: [
                        {menuType: 'table', name: 'usuarios', label: 'gestión de usuarios'},
                        {menuType: 'table', name: 'roles', label: 'roles de acceso'},
                    ]},
                ]}
            );
        }
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
            estados_movimiento,
            estados_bien,
            estado_bien_viejo,
            acciones,
            estados,
            estados_acciones,
            movimientos_solicitudes,
            movimientos_solicitud_bien,
            movimientos_bien,
            movimientos_solicitudes_acciones,
            declaraciones,
            declaraciones_bienes,
            tipo_asignacion,
            modalidad_uso,
            motivos_baja,
            tipo_contrato,
            responsables,
            sedes       ,
            jerarquias  ,
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
            historial   ,
            proveedores,
        
        }
    }       
}

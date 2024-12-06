"use strict";

import { AppBackend, ExpressPlus, Context, Request, 
    ClientModuleDefinition, OptsClientPage, MenuDefinition, MenuInfoBase
} from "./types-principal";

import * as MiniTools from 'mini-tools';
//import {json} from 'pg-promise-strict';

import {ProceduresInventario} from "./procedures-principal";

import { bienes } from './table-bienes';
import { areas } from './table-areas';
import { usuarios   } from './table-usuarios';
import { grupos } from './table-grupos';

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
    override addSchrödingerServices(mainApp:ExpressPlus, baseUrl:string){
        var be=this;
        if(baseUrl=='/'){
            baseUrl='';
        }   
        mainApp.get(baseUrl+'/main',async function(req,res,_next){
            // @ts-ignore useragent existe
            var {useragent} = req;
            var htmlMain=be.mainPage({useragent}, false, {skipMenu:true}).toHtmlDoc();
            MiniTools.serveText(htmlMain,'html')(req,res);
        });
        super.addSchrödingerServices(mainApp, baseUrl);
    }
    override addUnloggedServices(mainApp:ExpressPlus, baseUrl:string){
        var be=this;
        if(baseUrl=='/'){
            baseUrl='';
        }   
        mainApp.get(baseUrl+'/bienes.js',async function(req,res,_next){
            var bienes = await be.inDbClient(req as Request, async function(client){
                var result = await client.query(`
                    SELECT ficha, integrado, observacion
                        FROM bienes
                        ORDER BY fecha DESC
                `).fetchAll();
                console.log(result);
                return result.rows;
            });
            console.log(bienes);
            var bienes_js = 'var bienes = '+JSON.stringify(bienes);
            console.log(bienes_js);
            MiniTools.serveText(bienes_js,'text/javascript')(req, res);
        });
        super.addUnloggedServices(mainApp, baseUrl);
    }
    override async getProcedures(){
        var be = this;
        return [
            ...await super.getProcedures(),
            ...ProceduresInventario
        ].map(be.procedureDefCompleter, be);
    }
    override getMenu(context:Context):MenuDefinition{
        var menuContent:MenuInfoBase[]=[
            {menuType:'menu', name:'inventario', label:'inventario',  menuContent:[
                {menuType:'table', name:'bienes', label:'bienes', selectedByDefault:true},
                {menuType:'table', name:'areas', label:'areas'},
                {menuType:'table', name:'grupos', label:'grupos'},
                {menuType:'prueba', name:'prueba', label:'prueba'}
            ]},
        ];
        if(context.user && context.user.rol=="admin"){
            menuContent.push(
                {menuType:'menu', name:'config', label:'configurar', menuContent:[
                    {menuType:'table', name:'usuarios'  },
                ]}
            )
        };
        return {menu:menuContent};
    }
    override clientIncludes(req:Request|null, opts:OptsClientPage):ClientModuleDefinition[]{
        var UsandoREact = true;
        var menuedResources:ClientModuleDefinition[]=req && opts && !opts.skipMenu ? [
            { type:'js' , src:'client/client.js' },
        ]:[
            {type:'js' , src:'unlogged.js' },
        ];
        var list: ClientModuleDefinition[] = [
            ...(UsandoREact?[
                { type: 'js', module: 'react', modPath: 'umd', fileDevelopment:'react.development.js', file:'react.production.min.js' },
                { type: 'js', module: 'react-dom', modPath: 'umd', fileDevelopment:'react-dom.development.js', file:'react-dom.production.min.js' },
                { type: 'js', module: '@mui/material', modPath: '../umd', fileDevelopment:'material-ui.development.js', file:'material-ui.production.min.js'},
                { type: 'js', module: 'clsx', file:'clsx.min.js' },
                { type: 'mjs', module: '@reduxjs/toolkit', modPath:'../', file:'redux-toolkit.browser.mjs'},
                { type: 'mjs', module: 'react-redux', modPath:'../', file:'react-redux.browser.mjs'},
            ]:[]) satisfies ClientModuleDefinition[],
            ...super.clientIncludes(req, opts),
            ...(UsandoREact?[
                { type: 'js', module: 'redux-typed-reducer', modPath:'../dist', file:'redux-typed-reducer.js' },
                { type: 'js', src: 'adapt.js' },
            ]:[])  satisfies ClientModuleDefinition[],
            { type: 'js', src: 'formulario-bien.js' },
            { type: 'js', src: 'inventario.js' },
            { type: 'js', src: 'bienes.js' },
            { type: 'css', file: 'inventario.css' },
            { type: 'css', file: 'menu.css' },
            ... menuedResources
        ] satisfies ClientModuleDefinition[];
        return list;
    }
    override prepareGetTables(){
        super.prepareGetTables();
        this.getTableDefinition={
            ... this.getTableDefinition,
            usuarios  ,    
            bienes,
            areas,
            grupos,
        }
    }       
}

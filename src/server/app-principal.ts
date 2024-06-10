"use strict";

import { AppBackend, ExpressPlus, Context, Request, 
    ClientModuleDefinition, OptsClientPage, MenuDefinition, MenuInfoBase
} from "./types-principal";

import * as MiniTools from 'mini-tools';
import {json} from 'pg-promise-strict';

import {ProceduresInventario} from "./procedures-principal";

import { ejemplo_noticias } from './table-ejemplo_noticias';
import { ejemplo_vinculos } from './table-ejemplo_vinculos';
import { usuarios   } from './table-usuarios';

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
        mainApp.get(baseUrl+'/pub',async function(req,res,_next){
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
        mainApp.get(baseUrl+'/ejemplo_publicaciones.js',async function(req,res,_next){
            var publicaciones = await be.inDbClient(req as Request, async function(client){
                var result = await client.query(`
                    SELECT url, titulo, texto, formato, fecha, autor, 
                            ${json(`SELECT vinculo, orden FROM ejemplo_vinculos v WHERE v.url=n.url `,'orden')} as vinculos
                        FROM ejemplo_noticias n
                        WHERE publicar
                            AND fecha <= current_date
                        ORDER BY fecha DESC
                `).fetchAll();
                console.log(result);
                return result.rows;
            });
            console.log(publicaciones);
            var publicaciones_js = 'var ejemplo_publicaciones = '+JSON.stringify(publicaciones);
            console.log(publicaciones_js);
            MiniTools.serveText(publicaciones_js,'text/javascript')(req, res);
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
            {menuType:'menu', name:'redaccion', label:'redacción',  menuContent:[
                {menuType:'table', name:'ejemplo_noticias', label:'noticias', selectedByDefault:true},
                {menuType:'proc' , name:'ejemplo_publicar_propios', label:'publicar'},
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
            { type:'js' , src:'client.js' },
        ]:[
            {type:'js' , src:'unlogged.js' },
        ];
        var list: ClientModuleDefinition[] = [
            ...(UsandoREact?[
                { type: 'js', module: 'react', modPath: 'umd', fileDevelopment:'react.development.js', file:'react.production.min.js' },
                { type: 'js', module: 'react-dom', modPath: 'umd', fileDevelopment:'react-dom.development.js', file:'react-dom.production.min.js' },
                { type: 'js', module: '@mui/material', modPath: 'umd', fileDevelopment:'material-ui.development.js', file:'material-ui.production.min.js' },
                { type: 'js', module: 'clsx', file:'clsx.min.js' },
                { type: 'js', module: 'redux', modPath:'../dist', fileDevelopment:'redux.js', file:'redux.min.js' },
                { type: 'js', module: 'react-redux', modPath:'../dist', fileDevelopment:'react-redux.js', file:'react-redux.min.js' },
            ]:[]) satisfies ClientModuleDefinition[],
            ...super.clientIncludes(req, opts),
            ...(UsandoREact?[
                { type: 'js', module: 'redux-typed-reducer', modPath:'../dist', file:'redux-typed-reducer.js' },
                { type: 'js', src: 'adapt.js' },
            ]:[])  satisfies ClientModuleDefinition[],
            { type: 'js', src: 'ejemplo_publicaciones.js' },
            { type: 'js', src: 'ejemplo-pub-inventario.js' },
            { type: 'css', file: 'ejemplo-pub-inventario.css' },
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
            ejemplo_noticias,    
            ejemplo_vinculos,    
        }
    }       
}

"use strict";

import { AppBackend, ExpressPlus, Context, Request, 
    ClientModuleDefinition, OptsClientPage, MenuDefinition, MenuInfoBase
} from "./types-principal";

import * as MiniTools from 'mini-tools';

import {ProceduresInventario} from "./procedures-principal";

import { bienes } from './table-bienes';
import { areas } from './table-areas';
import { usuarios   } from './table-usuarios';
import { grupos } from './table-grupos';

import {staticConfigYaml} from './def-config';
import * as express from "express";
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
        const reactBasePath = '/react';
        const reactRouter = express.Router();
        reactRouter.get('/',async function(req,res,_next){
            // @ts-ignore useragent existe
            const {useragent, user} = req;
            if(user){
                var htmlMain=be.mainPage(
                    {useragent}, 
                    false, 
                    {
                        skipMenu:false, 
                        extraFiles: [{
                            type:'js',
                            src:'client/client-bundle.js'
                        }],
                        baseUrlForRelativePaths:true
                    }
                );
                MiniTools.serveText(htmlMain.toHtmlDoc(), 'html')(req,res);
            }else{
                res.redirect(baseUrl+`/login#w=path&path=/react`)
            }
        });
        mainApp.use(`${baseUrl}${reactBasePath}/*`, reactRouter);
        mainApp.use(`${baseUrl}${reactBasePath}`, reactRouter);

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
        var menuedResources:ClientModuleDefinition[]=req && opts && !opts.skipMenu ? [
            {type:'js' , src:'client/client.js' },
        ]:[
            {type:'js' , src:'unlogged.js' },
        ];
        var list: ClientModuleDefinition[] = [
            ...super.clientIncludes(req, opts),
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

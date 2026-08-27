"use strict";

import { AppBackend, Context, Request, ExpressPlus,
    ClientModuleDefinition, OptsClientPage, MenuDefinition, MenuInfoBase
} from "./types-principal";

import { rm } from "fs/promises";
import * as MiniTools from "mini-tools";

import {ProceduresInventario} from "./procedures-principal";
import { roles } from "./table-roles";
import { bienes } from './table-bienes';
import { usuarios   } from './table-usuarios';
import { grupos } from './table-grupos';
import { tipo_espacio } from "./table-tipo_espacio";
import { espacios } from "./table-espacios";
import { ordenes_compra } from "./table-ordenes_compra";
import { rubros } from "./table-rubros";
import { responsables } from "./table-responsables";
import { sedes } from "./table-sedes";
import { tipo_bien } from "./table-tipo_bien";
import { tipo_sector } from "./table-tipo_sector";
import { sectores } from './table-sectores';
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
import { tipo_clave } from "./table-tipo_clave";
import { claves_bienes } from "./table-claves_bienes";
import { tipo_ordencompra } from "./table-tipo_ordencompra";
import { estado_ordencompra } from "./table-estado_ordencompra";
import { proveedores } from "./table-proveedores";
import { estados_movimiento } from "./table-estados_movimiento";
import { movimientos_solicitudes } from "./table-movimientos_solicitudes";
import { movimientos_solicitud_bien } from "./table-movimientos_solicitud_bien";
import { acciones } from "./table-acciones";
import { estados } from "./table-estados";
import { estados_acciones } from "./table-estados_acciones";
import { movimientos_solicitudes_acciones } from "./table-movimientos_solicitudes_acciones";
import { historial_bienes } from "./table-historial_bienes";
import { historial_evento_bien } from "./table-historial_evento_bien";
import { bienes_atributos } from "./table-bienes_atributos";
import { bien_atributo } from "./table-bien_atributo";
import { bienes_atributo_valores } from "./table-bienes_atributo_valores";
import { declaraciones } from "./table-declaraciones";
import { declaraciones_bienes } from "./table-declaraciones_bienes";
import { declaraciones_documentos } from "./table-declaraciones_documentos";
import { solicitudes_documentos } from "./table-solicitudes_documentos";
import { estados_declaracion } from "./table-estados_declaracion";
import { reporte_bienes_por_sector } from "./table-reporte_bienes_por_sector";
import { reporte_bienes_por_responsable } from "./table-reporte_bienes_por_responsable";
import { reporte_bienes_listado } from "./table-reporte_bienes_listado";
import { reporte_bienes_dependientes } from "./table-reporte_bienes_dependientes";
import { mis_bienes_a_cargo, mis_bienes_asignados } from "./table-mis_bienes";
import { parque_tecnologico } from "./table-parque_tecnologico";
import { setAtributosDeBienes, VINCULOS_CON_EL_BIEN } from "./reportes-bienes";
import { jerarquias } from "./table-jerarquias";
import { adjuntos_bienes } from "./table-adjuntos_bienes";
import { adjuntos_solicitudes } from "./table-adjuntos_solicitudes";
import { archivos_borrar } from "./table-archivos_borrar";

import {contentDisposition, fechaParaNombre, nombreDeArchivo} from './nombre-archivo';
import {staticConfigYaml} from './def-config';

const cronMantenimiento = (be:AppBackend) => {
    const interval = setInterval(async ()=>{
        try{
            const d = new Date();
            const date = `${d.getDate()}/${d.getMonth()}/${d.getFullYear()}, ${d.getHours()}:${d.getMinutes()}`;
            if(d.getHours() == 23 && d.getMinutes() == 58){
                const result = await be.inTransaction(null, async (client)=>{
                    const {rows} = await client.query("select ruta_archivo from archivos_borrar").fetchAll();
                    if(rows.length>0){
                        rows.forEach(async (element) => {
                            const path = `local-attachments/${element.ruta_archivo}`;
                            await client.query(`delete from archivos_borrar where ruta_archivo = $1`, [element.ruta_archivo]).execute();
                            await rm(path, { force: true });
                        });
                        return `Se borraron archivos adjuntos en la fecha y hora: ${date}`;
                    }else{
                        return `No hay archivos adjuntos para borrar en la fecha y hora: ${date}`;
                    }
                });
                console.info("Resultado de cron: ", result);
            }
        }catch(err){
            console.error(`Error en cron. ${err}`);
        }
    },60000);
    be.shutdownCallbackListAdd({
        message:'cron Mantenimiento',
        fun:async function(){
            clearInterval(interval);
            return Promise.resolve();
        }
    });
}

const cargarAtributosDeBienes = async (be:AppBackend) => {
    try{
        const lista = await be.inTransaction(null, async (client)=>{
            const {rows} = await client.query(
                `SELECT atributo, nombre FROM bienes_atributos ORDER BY atributo`
            ).fetchAll();
            return rows.map((fila:any) => ({
                atributo:String(fila.atributo),
                nombre:String(fila.nombre ?? fila.atributo),
            }));
        });
        setAtributosDeBienes(lista);
        console.info(`Atributos de bienes cargados para la grilla: ${lista.length}`);
    }catch(err){
        console.warn(`No se pudieron leer los atributos de bienes: ${err}`);
        setAtributosDeBienes([]);
    }
}

export class AppInventario extends AppBackend{
    constructor(){
        super();
    }
    override async postConfig(){
        cronMantenimiento(this);
        await cargarAtributosDeBienes(this);
        await super.postConfig();
    }
    override addSchrödingerServices(mainApp:ExpressPlus, baseUrl:string){
        const be = this;
        super.addSchrödingerServices(mainApp, baseUrl);
        mainApp.get(baseUrl+'/download/adjunto_bien', async function (req, res) {
            // @ts-ignore
            await be.inDbClient(req, async (client)=>{
                const result = await client.query(
                    'SELECT ficha, numero_adjunto, archivo FROM adjuntos_bienes WHERE ficha = $1 AND numero_adjunto = $2',
                    [req.query.ficha, req.query.numero_adjunto]
                ).fetchUniqueRow();
                const path = `local-attachments/${result.row.archivo}`;
                MiniTools.serveFile(path, {})(req, res);
            });
        });
        mainApp.get(baseUrl+'/download/declaracion_documento', async function (req, res) {
            // @ts-ignore
            await be.inDbClient(req, async (client)=>{
                const result = await client.query(
                    `SELECT dd.archivo, d.fecha,
                            upper(coalesce(nullif(btrim(concat_ws(', ',
                                nullif(btrim(r.apellido), ''),
                                nullif(btrim(r.nombre), '')
                            )), ''), coalesce(d.responsable, ''))) AS responsable_nombre
                        FROM declaraciones_documentos dd
                        JOIN declaraciones d ON d.declaracion = dd.declaracion
                        LEFT JOIN responsables r ON r.responsable = d.responsable
                        WHERE dd.declaracion = $1 AND dd.version = $2 AND dd.tipo = $3`,
                    [req.query.declaracion, req.query.version, req.query.tipo]
                ).fetchUniqueRow();
                const path = `local-attachments/${result.row.archivo}`;
                res.setHeader('Content-Disposition', contentDisposition(nombreDeArchivo([
                    `declaracion ${req.query.declaracion}`,
                    fechaParaNombre(result.row.fecha),
                    result.row.responsable_nombre,
                    `v${req.query.version}`,
                    req.query.tipo === 'firmado' ? 'firmado' : '',
                ])));
                MiniTools.serveFile(path, {})(req, res);
            });
        });
        mainApp.get(baseUrl+'/download/solicitud_documento', async function (req, res) {
            // @ts-ignore
            await be.inDbClient(req, async (client)=>{
                const result = await client.query(
                    `SELECT sd.archivo, sd.archivo_firmado, sd.tipo,
                            nullif(btrim(ms.accion), '') AS accion
                        FROM solicitudes_documentos sd
                        JOIN movimientos_solicitudes ms ON ms.acta = sd.acta
                        WHERE sd.acta = $1 AND sd.tipo = $2 AND sd.version = $3`,
                    [req.query.acta, req.query.tipo, req.query.version]
                ).fetchUniqueRow();
                const firmado = req.query.firmado === 'true';
                const cual = firmado ? result.row.archivo_firmado : result.row.archivo;
                if(cual == null){
                    res.status(404).send('El documento pedido no está cargado');
                    return;
                }
                const accion = result.row.accion ?? result.row.tipo;
                res.setHeader('Content-Disposition', contentDisposition(nombreDeArchivo([
                    accion,
                    `acta ${req.query.acta}`,
                    `v${req.query.version}`,
                    firmado ? 'firmado' : '',
                ])));
                MiniTools.serveFile(`local-attachments/${cual}`, {})(req, res);
            });
        });
        mainApp.get(baseUrl+'/download/adjunto_solicitud', async function (req, res) {
            // @ts-ignore
            await be.inDbClient(req, async (client)=>{
                const result = await client.query(
                    'SELECT acta, numero_adjunto, archivo FROM adjuntos_solicitudes WHERE acta = $1 AND numero_adjunto = $2',
                    [req.query.acta, req.query.numero_adjunto]
                ).fetchUniqueRow();
                const path = `local-attachments/${result.row.archivo}`;
                MiniTools.serveFile(path, {})(req, res);
            });
        });
    }
    override configStaticConfig(){
        super.configStaticConfig();
        this.setStaticConfig(staticConfigYaml);
    }
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
            {menuType:'principal', name:'principal', label:'principal'     },
            {menuType: 'menu', name: 'mis_bienes', label: 'mis bienes', menuContent:
                VINCULOS_CON_EL_BIEN.map((vinculo, i) => ({
                    menuType: 'table', name: vinculo.mio.tabla, label: vinculo.mio.label,
                    selectedByDefault: i === 0,
                }))
            },
            {menuType: 'menu', name: 'bienes' , label: 'inventario', menuContent: [
                {menuType: 'table', name: 'bienes', label: 'todos', selectedByDefault: true},
                {menuType: 'table', name: 'bienes_activos', table: 'bienes', label: 'bienes en alta', ff: {activo: true}},
                {menuType: 'table', name: 'bienes_inactivos', table: 'bienes', label: 'bienes en baja', ff: {activo: false}},
            ]},            
            {menuType: 'menu', name: 'operaciones', label: 'operaciones', menuContent: [
                {menuType: 'table', name: 'declaraciones', label: 'declaraciones'},
                {menuType: 'solicitudes', name: 'solicitudes_movimiento', label: 'solicitudes de movimiento'},
                {menuType: 'table', name: 'movimientos_solicitudes_acciones', label: 'solicitudes (con acciones)'},
                {menuType: 'table', name: 'movimientos_solicitudes', label: 'solicitudes (sólo datos)'},
            ]},

            {menuType: 'menu', name: 'reportes', label: 'reportes', menuContent: [
                {menuType: 'table', name: 'reporte_bienes_por_sector', label: 'bienes por sector patrimonial'},
                {menuType: 'table', name: 'reporte_bienes_por_responsable', label: 'bienes por responsable'},
                {menuType: 'table', name: 'parque_tecnologico', label: 'parque tecnológico'},
            ]},
    
            {menuType: 'menu', name: 'gestion', label: 'gestion de datos', menuContent: [
                {menuType: 'table', name: 'sectores', label: 'sectores'},
                {menuType: 'table', name: 'responsables', label: 'responsables'},
                {menuType: 'table', name: 'espacios', label: 'espacios'},
                {menuType: 'table', name: 'ordenes_compra', label: 'ordenes de compra'},
                {menuType: 'table', name: 'proveedores', label: 'proveedores'},
                {menuType: 'table', name: 'marcas', label: 'marcas'},
                {menuType: 'table', name: 'grupos', label: 'grupos'},
                {menuType: 'table', name: 'sedes', label: 'sedes'},
                {menuType: 'menu', name: 'atributos', label: 'atributos', menuContent: [
                    {menuType: 'table', name: 'bienes_atributos', label: 'atributos de bienes'},
                    {menuType: 'table', name: 'bienes_atributo_valores', label: 'valores posibles'},
                ]},
            ]},
        ];
        
        if(context.user && context.es.admin){
            menuContent.push(
                {menuType: 'menu', name: 'configuracion', label: 'configuración', menuContent: [
                    {menuType: 'menu', name: 'referenciales', label: 'tablas referenciales', menuContent: [
                        {menuType: 'table', name: 'tipo_bien', label: 'tipos de bien'},
                        {menuType: 'table', name: 'categoria_bien', label: 'categorías de bien'},
                        {menuType: 'table', name: 'tipo_sector', label: 'tipos de sector'},
                        {menuType: 'table', name: 'tipo_espacio', label: 'tipos de espacio'},
                        {menuType: 'table', name: 'tipo_contrato', label: 'tipos de contrato'},
                        {menuType: 'table', name: 'tipo_ordencompra', label: 'tipos de OC'},
                        {menuType: 'table', name: 'tipo_asignacion', label: 'tipos de asignación'},
                        {menuType: 'table', name: 'tipo_clave', label: 'tipos de clave'},
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
                      {menuType: 'table', name: 'estados_declaracion', label: 'estados de declaración'},
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
        ];
        var list: ClientModuleDefinition[] = [
            { type: 'js', module: 'react', modPath: 'umd', fileDevelopment:'react.development.js', file:'react.production.min.js' },
            { type: 'js', module: 'react-dom', modPath: 'umd', fileDevelopment:'react-dom.development.js', file:'react-dom.production.min.js' },
              ...super.clientIncludes(req, opts),
              { type: 'js', src: 'adapt.js' },
              { type: 'js', file: 'client/ws-principal.js' },
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
            historial_bienes,
            historial_evento_bien,
            bienes_atributos,
            bienes_atributo_valores,
            bien_atributo,
            estados_baja,
            estados_movimiento,
            estados_bien,
            acciones,
            estados,
            estados_acciones,
            declaraciones,
            declaraciones_bienes,
            declaraciones_documentos,
            solicitudes_documentos,
            estados_declaracion,
            reporte_bienes_por_sector,
            reporte_bienes_por_responsable,
            reporte_bienes_listado,
            reporte_bienes_dependientes,
            mis_bienes_a_cargo,
            mis_bienes_asignados,
            parque_tecnologico,
            tipo_asignacion,
            tipo_clave,
            claves_bienes,
            modalidad_uso,
            motivos_baja,
            tipo_contrato,
            responsables,
            sedes       ,
            jerarquias  ,
            roles       ,    
            tipo_sector ,
            sectores       ,
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
            proveedores ,
            movimientos_solicitudes,
            movimientos_solicitud_bien,
            movimientos_bien,
            movimientos_solicitudes_acciones,
            adjuntos_bienes,
            adjuntos_solicitudes,
            archivos_borrar
        }
    }
}

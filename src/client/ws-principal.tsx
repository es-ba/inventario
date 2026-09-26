import * as React from 'react';
import {Box} from '@mui/material';
import type {Connector, FixedFields} from 'frontend-plus';
import {BusquedaBienes} from './principal/busqueda-bienes';
import {BienFormulario} from './principal/bien/bien-formulario';
import {PantallaInventario} from './principal/base/pantalla-inventario';
import type {Fila} from './principal/base/tipos-tabla';
import './ws-solicitudes';
import './ws-bajas';
import './ws-controles';
import './ws-siper';
import {renderConnectedAppInventario} from './principal/render-connected-app-inventario';

type Vista =
    {nombre:'busqueda'}
    | {nombre:'bien', ficha?:string, clon?:{plantilla:Fila, de:string, vez:number}};

function PantallaPrincipal({
    conn,
    fixedFields,
    ficha,
}:{
    conn:Connector;
    fixedFields:FixedFields;
    ficha?:string;
}){
    const [vista, setVista] = React.useState<Vista>(ficha ? {nombre:'bien', ficha} : {nombre:'busqueda'});
    const [actualizacion, setActualizacion] = React.useState<{ficha:string, version:number}>();

    return <PantallaInventario titulo={vista.nombre === 'bien'
        ? `Inventario - Bien ${vista.ficha ?? (vista.clon ? `nuevo (copia de ${vista.clon.de})` : 'nuevo')}`
        : 'Inventario - Principal'}>
        {vista.nombre === 'bien'
            ? <BienFormulario
                key={vista.ficha ?? (vista.clon ? `clon-${vista.clon.vez}` : 'nuevo')}
                ficha={vista.ficha}
                plantilla={vista.clon?.plantilla}
                onClonar={(plantilla, de) => setVista({nombre:'bien', clon:{plantilla, de, vez:Date.now()}})}
                onVolver={() => setVista({nombre:'busqueda'})}
                onGuardado={fila => setActualizacion(anterior => ({ficha:String(fila.ficha), version:(anterior?.version ?? 0) + 1}))}
            />
            : null}
        <Box sx={{display:vista.nombre === 'busqueda' ? 'block' : 'none'}}>
            <BusquedaBienes
                conn={conn}
                fixedFields={fixedFields}
                visible={vista.nombre === 'busqueda'}
                actualizacion={actualizacion}
                onAbrirBien={ficha => setVista({nombre:'bien', ficha})}
                onNuevoBien={() => setVista({nombre:'bien', ficha:undefined})}
            />
        </Box>
    </PantallaInventario>;
}

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.principal = function principal(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        ({conn, fixedFields}) =>
            <PantallaPrincipal conn={conn} fixedFields={fixedFields}
                ficha={addrParams.ficha ? String(addrParams.ficha) : undefined}/>
    );
};

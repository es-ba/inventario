import * as React from 'react';
import type {Connector} from 'frontend-plus';

import {renderConnectedAppInventario} from './principal/render-connected-app-inventario';
import {PersonasSiper} from './principal/siper/personas-siper';
import {PantallaInventario} from './principal/base/pantalla-inventario';

function PantallaSiper(){
    return <PantallaInventario titulo="Siper - Personas">
        <PersonasSiper/>
    </PantallaInventario>;
}

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.siper = function siper(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        () => <PantallaSiper/>
    );
};

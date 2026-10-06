import * as React from 'react';
import type {Connector} from 'frontend-plus';

import {renderConnectedAppInventario} from './principal/render-connected-app-inventario';
import {PantallaInventario} from './principal/base/pantalla-inventario';
import {ConsultaMovimientos} from './principal/movimiento/consulta-movimientos';

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.movimientos = function movimientos(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        () => <PantallaInventario titulo="Consulta de movimientos"><ConsultaMovimientos/></PantallaInventario>
    );
};

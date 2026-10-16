import * as React from 'react';
import type {Connector} from 'frontend-plus';

import {renderConnectedAppInventario} from './principal/render-connected-app-inventario';
import {PantallaInventario} from './principal/base/pantalla-inventario';
import {BienesPorModelo} from './principal/modelos/bienes-por-modelo';

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.bienes_por_modelo = function bienes_por_modelo(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        () => <PantallaInventario ayuda="modelos" titulo="Bienes por atributos"><BienesPorModelo/></PantallaInventario>
    );
};

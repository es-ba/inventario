import * as React from 'react';
import type {Connector} from 'frontend-plus';

import {renderConnectedAppInventario} from './principal/render-connected-app-inventario';
import {BajasListado} from './principal/baja/bajas-listado';
import {BienFormulario} from './principal/bien/bien-formulario';
import {PantallaInventario} from './principal/base/pantalla-inventario';

type Vista =
    {nombre:'listado'}
    | {nombre:'bien', ficha:string};

function PantallaBajas(){
    const [vista, setVista] = React.useState<Vista>({nombre:'listado'});

    return <PantallaInventario titulo={vista.nombre === 'bien' ? `Baja - Bien ${vista.ficha}` : 'Proceso de baja'}>
        {vista.nombre === 'bien'
            ? <BienFormulario
                ficha={vista.ficha}
                onVolver={() => setVista({nombre:'listado'})}
            />
            : <BajasListado
                onAbrirBien={ficha => setVista({nombre:'bien', ficha})}
            />
        }
    </PantallaInventario>;
}

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.bajas = function bajas(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        () => <PantallaBajas/>
    );
};

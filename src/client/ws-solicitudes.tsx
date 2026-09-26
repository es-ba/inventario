import * as React from 'react';
import {Box} from '@mui/material';
import type {Connector} from 'frontend-plus';

import {renderConnectedAppInventario} from './principal/render-connected-app-inventario';
import {SolicitudesListado} from './principal/solicitud/solicitudes-listado';
import {SolicitudFormulario} from './principal/solicitud/solicitud-formulario';
import {PantallaInventario} from './principal/base/pantalla-inventario';

type Vista =
    {nombre:'listado'}
    | {nombre:'solicitud', acta?:string};

function PantallaSolicitudes({acta}:{acta?:string}){
    const [vista, setVista] = React.useState<Vista>(acta ? {nombre:'solicitud', acta} : {nombre:'listado'});
    const [version, setVersion] = React.useState(0);

    return <PantallaInventario titulo={vista.nombre === 'solicitud'
        ? `Solicitud ${vista.acta ?? 'nueva'}`
        : 'Solicitudes de movimiento'}>
        <Box sx={{display:vista.nombre === 'listado' ? 'block' : 'none'}}>
            <SolicitudesListado
                recargar={version}
                onAbrir={numero => setVista({nombre:'solicitud', acta:numero})}
            />
        </Box>
        {vista.nombre === 'solicitud'
            ? <SolicitudFormulario
                acta={vista.acta}
                onIdentificada={numero => setVista({nombre:'solicitud', acta:numero})}
                onVolver={() => {
                    setVersion(v => v + 1);
                    setVista({nombre:'listado'});
                }}
            />
            : null}
    </PantallaInventario>;
}

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.solicitudes = function solicitudes(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        () => <PantallaSolicitudes acta={addrParams.acta}/>
    );
};

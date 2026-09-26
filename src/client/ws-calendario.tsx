import * as React from 'react';
import {Box} from '@mui/material';
import type {Connector} from 'frontend-plus';

import {renderConnectedAppInventario} from './principal/render-connected-app-inventario';
import {PantallaInventario} from './principal/base/pantalla-inventario';
import {useDatosReferencial} from './principal/base/cache-tablas';
import {CalendarioMes} from './principal/calendario/calendario-mes';
import {CalendarioDia} from './principal/calendario/calendario-dia';
import {Leyenda, TipoVisible} from './principal/calendario/calendario-comun';
import {COLORES_DE_EVENTO, ColorDeEvento, hoyYmd} from '../common/calendario';

type Vista = {vista:'mes'|'dia', fecha:string};

function PantallaCalendario(){
    const [estado, setEstado] = React.useState<Vista>(() => ({vista:'mes', fecha:hoyYmd()}));
    const [ocultos, setOcultos] = React.useState<Set<string>>(new Set());
    const catalogo = useDatosReferencial('tipos_evento_calendario');

    const tipos = React.useMemo<TipoVisible[]>(() => catalogo.filas
        .filter(f => f.activo !== false)
        .map(f => ({
            tipo:String(f.tipo),
            etiqueta:String(f.etiqueta ?? f.tipo),
            color:(COLORES_DE_EVENTO as readonly string[]).includes(String(f.color)) ? f.color as ColorDeEvento : 'default',
            orden:Number(f.orden ?? 0),
        }))
        .sort((a, b) => a.orden - b.orden || a.tipo.localeCompare(b.tipo)), [catalogo.filas]);

    const alternar = (tipo:string) => setOcultos(anteriores => {
        const nuevos = new Set(anteriores);
        if(nuevos.has(tipo)){ nuevos.delete(tipo); }else{ nuevos.add(tipo); }
        return nuevos;
    });

    return <PantallaInventario titulo="Calendario">
        <Box sx={{p:{xs:1, md:2}}}>
            <Box sx={{mb:2}}>
                <Leyenda tipos={tipos} ocultos={ocultos} onAlternar={alternar}/>
            </Box>
            {estado.vista === 'mes'
                ? <CalendarioMes
                    fecha={estado.fecha}
                    tipos={tipos}
                    ocultos={ocultos}
                    onCambiarMes={fecha => setEstado({vista:'mes', fecha})}
                    onElegirDia={fecha => setEstado({vista:'dia', fecha})}
                />
                : <CalendarioDia
                    fecha={estado.fecha}
                    tipos={tipos}
                    ocultos={ocultos}
                    onCambiarDia={fecha => setEstado({vista:'dia', fecha})}
                    onVolverAlMes={() => setEstado(actual => ({vista:'mes', fecha:actual.fecha}))}
                />}
        </Box>
    </PantallaInventario>;
}

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.calendario = function calendario(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        () => <PantallaCalendario/>
    );
};

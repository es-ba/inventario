import * as React from 'react';
import {createRoot, Root} from 'react-dom/client';
import type {Connector, FixedFields} from 'frontend-plus';
import {ThemeProvider} from '@mui/material/styles';

import {BaseInventarioProvider} from './base/contexto-base';
import {temaInventario} from './base/tema';

type AddrParamsInventario = {
    table?: string;
    ff?: Record<string, unknown> | FixedFields;
};

export type ConnectedAppProps = {
    table: string;
    fixedFields: FixedFields;
    conn: Connector;
};

let connectedRoot: Root | null = null;
let connectedHost: HTMLElement | null = null;
let layoutObserver: MutationObserver | null = null;

export function normalizeFixedFields(ff:AddrParamsInventario['ff']):FixedFields{
    if(Array.isArray(ff)){
        return ff;
    }
    const fixedFields:FixedFields = [];
    Object.keys(ff ?? {}).forEach(fieldName => {
        fixedFields.push({
            fieldName,
            value:(ff as Record<string, unknown>)[fieldName],
        });
    });
    return fixedFields;
}

export function unmountConnectedAppInventario():void{
    layoutObserver?.disconnect();
    layoutObserver = null;
    if(connectedRoot != null){
        connectedRoot.unmount();
        connectedRoot = null;
    }
    connectedHost?.remove();
    connectedHost = null;
}

export function volverAlMenu():void{
    irA('');
}

export function irA(hash:string):void{
    unmountConnectedAppInventario();
    const anterior = location.hash;
    location.hash = hash;
    if(location.hash === anterior){
        (myOwn as unknown as {showPage:() => void}).showPage();
    }
}

export function abreAparte(evento:React.MouseEvent):boolean{
    return evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey;
}

export function vinculo(hash:string, salir:(destino:() => void) => void = destino => destino()){
    return {
        href:`${location.pathname}${location.search}#${hash}`,
        onClick:(evento:React.MouseEvent) => {
            evento.stopPropagation();
            if(abreAparte(evento)){
                return;
            }
            evento.preventDefault();
            salir(() => irA(hash));
        },
    };
}

export function renderConnectedAppInventario(
    conn:Connector,
    addrParams:AddrParamsInventario,
    layout:HTMLElement,
    ConnectedApp:(props:ConnectedAppProps) => React.JSX.Element,
):void{
    unmountConnectedAppInventario();
    layout.innerHTML = '';
    const host = document.createElement('div');
    host.dataset.reactScreen = 'principal';
    layout.appendChild(host);
    connectedHost = host;
    connectedRoot = createRoot(host);
    layoutObserver = new MutationObserver(() => {
        if(connectedHost != null && !layout.contains(connectedHost)){
            const detachedRoot = connectedRoot;
            layoutObserver?.disconnect();
            layoutObserver = null;
            connectedRoot = null;
            connectedHost = null;
            detachedRoot?.unmount();
        }
    });
    layoutObserver.observe(layout, {childList:true});
    connectedRoot.render(
        <ThemeProvider theme={temaInventario}>
            <BaseInventarioProvider conn={conn}>
                <ConnectedApp
                    table={addrParams.table ?? ''}
                    fixedFields={normalizeFixedFields(addrParams.ff)}
                    conn={conn}
                />
            </BaseInventarioProvider>
        </ThemeProvider>
    );
}

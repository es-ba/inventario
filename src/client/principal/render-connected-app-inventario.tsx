import * as React from 'react';
import {createRoot, Root} from 'react-dom/client';
import type {Connector, FixedFields} from 'frontend-plus';

import {BaseInventarioProvider} from './base/contexto-base';

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
        <BaseInventarioProvider conn={conn}>
            <ConnectedApp
                table={addrParams.table ?? ''}
                fixedFields={normalizeFixedFields(addrParams.ff)}
                conn={conn}
            />
        </BaseInventarioProvider>
    );
}

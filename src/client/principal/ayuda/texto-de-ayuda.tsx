import * as React from 'react';
import {Box} from '@mui/material';
import {marked} from 'marked';

import {useSalida} from '../base/contexto-base';
import {abreAparte, irA} from '../render-connected-app-inventario';

export function TextoDeAyuda({texto, onSeccion}:{texto:string, onSeccion:(clave:string) => void}){
    const solicitarSalida = useSalida();
    const html = React.useMemo(() => marked.parse(texto, {async:false}), [texto]);
    return <Box
        dangerouslySetInnerHTML={{__html:html}}
        onClick={(evento:React.MouseEvent) => {
            const href = (evento.target as HTMLElement).closest('a')?.getAttribute('href') ?? '';
            if(href.startsWith('#ayuda/')){
                evento.preventDefault();
                onSeccion(href.slice('#ayuda/'.length));
            }else if(href.startsWith('#w=') && !abreAparte(evento)){
                evento.preventDefault();
                solicitarSalida(() => irA(href.slice(1)));
            }
        }}
        sx={{
            typography:'body1',
            lineHeight:1.6,
            '& h1':{typography:'h5', fontWeight:600, mt:0, mb:2},
            '& h2':{typography:'h6', fontWeight:600, mt:3, mb:1},
            '& h3':{typography:'subtitle1', fontWeight:600, mt:2, mb:0.5},
            '& p, & ul, & ol':{mt:0, mb:1.5},
            '& li':{mb:0.5},
            '& a':{color:'primary.main'},
            '& code':{fontFamily:'monospace', bgcolor:'action.hover', px:0.5, borderRadius:0.5},
            '& blockquote':{m:0, mb:1.5, px:2, py:1, borderLeft:4, borderColor:'info.main', bgcolor:'action.hover'},
            '& blockquote p:last-child':{mb:0},
            '& table':{borderCollapse:'collapse', mb:2, width:'100%'},
            '& th, & td':{border:1, borderColor:'divider', px:1, py:0.5, textAlign:'left', verticalAlign:'top'},
            '& th':{bgcolor:'action.hover'},
            '& img':{display:'block', maxWidth:'100%', height:'auto', border:1, borderColor:'divider', borderRadius:1},
        }}
    />;
}

import inicio from './manual/inicio.md';
import busqueda from './manual/busqueda.md';
import ficha from './manual/ficha.md';
import mover from './manual/mover.md';
import solicitudes from './manual/solicitudes.md';
import declaraciones from './manual/declaraciones.md';
import bajas from './manual/bajas.md';
import controles from './manual/controles.md';
import calendario from './manual/calendario.md';
import movimientos from './manual/movimientos.md';
import categorias from './manual/categorias.md';
import grillas from './manual/grillas.md';
import siper from './manual/siper.md';

import imgBajas from './manual/img/bajas.jpg';
import imgBusqueda from './manual/img/busqueda.jpg';
import imgCalendario from './manual/img/calendario.jpg';
import imgCategorias from './manual/img/categorias.jpg';
import imgControlBien from './manual/img/control-bien.jpg';
import imgControles from './manual/img/controles.jpg';
import imgFicha from './manual/img/ficha.jpg';
import imgGrilla from './manual/img/grilla.jpg';
import imgMover from './manual/img/mover.jpg';
import imgMovimientos from './manual/img/movimientos.jpg';
import imgPanelAyuda from './manual/img/panel-ayuda.jpg';
import imgSiper from './manual/img/siper.jpg';
import imgSolicitud from './manual/img/solicitud.jpg';
import imgSolicitudes from './manual/img/solicitudes.jpg';
import imgVistaRapida from './manual/img/vista-rapida.jpg';

const IMAGENES:Record<string, string> = {
    'bajas.jpg':imgBajas,
    'busqueda.jpg':imgBusqueda,
    'calendario.jpg':imgCalendario,
    'categorias.jpg':imgCategorias,
    'control-bien.jpg':imgControlBien,
    'controles.jpg':imgControles,
    'ficha.jpg':imgFicha,
    'grilla.jpg':imgGrilla,
    'mover.jpg':imgMover,
    'movimientos.jpg':imgMovimientos,
    'panel-ayuda.jpg':imgPanelAyuda,
    'siper.jpg':imgSiper,
    'solicitud.jpg':imgSolicitud,
    'solicitudes.jpg':imgSolicitudes,
    'vista-rapida.jpg':imgVistaRapida,
};

export type SeccionDeAyuda = {clave:string, titulo:string, texto:string};

const seccion = (clave:string, texto:string):SeccionDeAyuda => ({
    clave,
    titulo:/^# (.+)$/m.exec(texto)?.[1] ?? clave,
    texto:texto.replace(/\]\(img\/([\w.-]+)\)/g, (todo, nombre:string) => IMAGENES[nombre] ? `](${IMAGENES[nombre]})` : todo),
});

export const MANUAL:SeccionDeAyuda[] = [
    seccion('inicio', inicio),
    seccion('busqueda', busqueda),
    seccion('ficha', ficha),
    seccion('mover', mover),
    seccion('solicitudes', solicitudes),
    seccion('declaraciones', declaraciones),
    seccion('bajas', bajas),
    seccion('controles', controles),
    seccion('calendario', calendario),
    seccion('movimientos', movimientos),
    seccion('categorias', categorias),
    seccion('grillas', grillas),
    seccion('siper', siper),
];

export function seccionDeAyuda(clave:unknown):SeccionDeAyuda{
    return MANUAL.find(s => s.clave === clave) ?? MANUAL[0];
}

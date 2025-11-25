
export type DireccionAccion = 'avance' | 'retroceso' | 'blanqueo'

export type EstadoAccion = {
    operativo: string
    estado: string
    eaccion: string
    condicion: string
    estado_destino: string
    eaccion_direccion: DireccionAccion
    path_icono_svg: string
    nombre_procedure: string
    nombre_wscreen: string
    desactiva_boton: boolean
    confirma: boolean
}
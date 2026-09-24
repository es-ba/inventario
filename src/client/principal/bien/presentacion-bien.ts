export type ColorDeChip = 'default'|'success'|'warning'|'info';

const COLOR_POR_ESTADO:Record<string, ColorDeChip> = {
    BAJA_EN_TRAMITE:'warning',
    EN_MOVIMIENTO:'info',
    ASIGNADO:'success',
};

export function colorDeEstado(estado:unknown):ColorDeChip{
    return COLOR_POR_ESTADO[String(estado ?? '').trim()] ?? 'default';
}

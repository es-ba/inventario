export type PersonaSiper = {
    idper:string,
    apellido:string,
    nombres:string,
    sector:string|null,
    activo:boolean,
    fecha_egreso:string|null,
};

const texto = (valor:unknown):string|null => {
    if(valor == null) return null;
    const limpio = String(valor).trim();
    return limpio === '' ? null : limpio;
};

export function validarPersonasSiper(personas:unknown):PersonaSiper[]{
    if(!Array.isArray(personas)) throw new Error('Lo recibido de siper debe ser una lista de personas');
    const vistos = new Set<string>();
    return personas.map((persona, n) => {
        const fila = n + 1;
        const idper = texto(persona?.idper);
        if(idper == null) throw new Error(`La persona ${fila} no tiene idper`);
        if(vistos.has(idper)) throw new Error(`El idper ${idper} está repetido`);
        vistos.add(idper);
        const apellido = texto(persona.apellido);
        if(apellido == null) throw new Error(`El idper ${idper} no tiene apellido`);
        if(typeof persona.activo !== 'boolean') throw new Error(`El idper ${idper} tiene un valor de activo inválido`);
        const fecha_egreso = texto(persona.fecha_egreso);
        if(fecha_egreso != null && !/^\d{4}-\d{2}-\d{2}$/.test(fecha_egreso)) {
            throw new Error(`El idper ${idper} tiene una fecha de egreso inválida: ${fecha_egreso}`);
        }
        return {
            idper,
            apellido,
            nombres:texto(persona.nombres) ?? '',
            sector:texto(persona.sector),
            activo:persona.activo,
            fecha_egreso,
        };
    });
}

export const DATOS_DE_SIPER = [
    {siper:'fecha_egreso'     , responsable:'fecha_egreso'     , tipo:'date', titulo:'fecha de egreso'},
    {siper:'fecha_ingreso'    , responsable:'fecha_ingreso'    , tipo:'date', titulo:'fecha de ingreso'},
    {siper:'situacion_revista', responsable:'situacion_revista', tipo:'text', titulo:'situación de revista'},
    {siper:'cuil'             , responsable:'cuil'             , tipo:'text', titulo:'cuil'},
    {siper:'tipo_doc'         , responsable:'tipo_doc'         , tipo:'text', titulo:'tipo de documento'},
    {siper:'documento'        , responsable:'documento'        , tipo:'text', titulo:'documento'},
    {siper:'ficha'            , responsable:'ficha_siper'      , tipo:'text', titulo:'ficha'},
    {siper:'domicilio'        , responsable:'domicilio'        , tipo:'text', titulo:'domicilio'},
    {siper:'telefono'         , responsable:'telefono'         , tipo:'text', titulo:'teléfono'},
] as const;

type DatoDeSiper = typeof DATOS_DE_SIPER[number]['siper'];

export type PersonaSiper = {
    idper:string,
    apellido:string,
    nombres:string,
    sector:string|null,
    activo:boolean,
} & Record<DatoDeSiper, string|null>;

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
        const datos = Object.fromEntries(DATOS_DE_SIPER.map(dato => {
            const valor = texto(persona[dato.siper]);
            if(dato.tipo === 'date' && valor != null && !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
                throw new Error(`El idper ${idper} tiene una ${dato.titulo} inválida: ${valor}`);
            }
            return [dato.siper, valor];
        })) as Record<DatoDeSiper, string|null>;
        return {
            idper,
            apellido,
            nombres:texto(persona.nombres) ?? '',
            sector:texto(persona.sector),
            activo:persona.activo,
            ...datos,
        };
    });
}

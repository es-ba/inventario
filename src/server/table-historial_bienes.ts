"use strict";

import { TableDefinition } from "./types-principal";

/*
    Detalle campo por campo de cada evento del bien: qué cambió, de qué valor a cuál.

    No se muestra en la aplicación —no está en el menú, ni como detalle de los eventos, ni
    en la ficha del bien—, pero la tabla sigue existiendo y llenándose: le escriben
    bienes_auditar_trg y trazabilidad_atributos_documentacion_trg. Se consulta por SQL
    cuando hace falta reconstruir qué pasó con un bien.

    Por eso queda registrada acá: sin la definición, el adapt no crearía la tabla y los
    triggers fallarían en la primera edición de un bien.
*/
export function historial_bienes(): TableDefinition {
    return {
        name: 'historial_bienes',
        elementName: 'cambio',
        title: 'Historial del bien',
        // No editable: es un rastro de auditoría, no un dato que alguien corrija a mano.
        // insert:true para el GRANT, porque los triggers que la llenan no son SECURITY
        // DEFINER y escriben con el usuario de la aplicación.
        editable: false,
        allow: {insert: true, update: false, delete: false, deleteAll: false},
        fields: [
            { name: 'ficha', typeName: 'text' },
            { name: 'orden', typeName: 'integer' },
            { name: 'campo', typeName: 'text' },
            { name: 'valor_anterior', typeName: 'text', nullable: true },
            { name: 'valor_nuevo', typeName: 'text', nullable: true },
            { name: 'fecha', typeName: 'timestamp' },
            { name: 'usuario', typeName: 'text' },
            { name: 'accion', typeName: 'text' },
            { name: 'origen', typeName: 'text' },
        ],
        primaryKey: ['ficha', 'orden', 'campo'],
        foreignKeys: [
            {references: 'historial_evento_bien',fields: ['ficha', 'orden']},
        ],
    };
}
